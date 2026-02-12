/**
 * TURBO TEST - Parallel Lint & Test Runner with Smart Caching
 * 
 * Runs ESLint and ng test in parallel on changed git files with colored output.
 * Detects git changes, filters to .ts/.html files for linting and .spec.ts for testing.
 * Kills all processes on first failure for fast feedback. ~50% faster than sequential runs.
 * 
 * CACHING:
 *   - Tracks test results in .turbo-cache.json
 *   - Only retests files that changed since last run
 *   - Shows cached results for unchanged passing tests
 *   - For compilation errors, only caches files explicitly mentioned in error message
 *   - Prevents false caching of unrelated test files when TS errors occur
 * 
 * USAGE:
 *   npm run turbo                    # Run lint and test in parallel
 *   npm run turbo -- --disable-lint  # Run only tests, skip linting
 *   npm run turbo -- --disable-cache # Ignore cache, run all tests
 *   npm run turbo -- --clear-cache   # Clear cache and run all tests
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes for enhanced console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const CACHE_FILE = '.vscode/.turbo-cache.json';

const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

/**
 * Filters error message to only include errors from a specific test file
 * 
 * When multiple spec files run together, their errors get combined.
 * This function extracts only the errors relevant to the specified file.
 * 
 * @param {string} fullError - Complete error message from test run
 * @param {string} filePath - Path to the spec file (e.g., "src/app/service.spec.ts")
 * @returns {string} Filtered error message containing only errors from the specified file
 */
function filterErrorsByFile(fullError, filePath) {
  const lines = fullError.split('\n');
  const filteredLines = [];
  let inRelevantSection = false;
  
  // Extract the TOTAL line first
  const totalLine = lines.find(line => line.includes('TOTAL:'));
  if (totalLine) {
    filteredLines.push(totalLine);
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Start of a test failure - check if it's from our file
    if (line.includes('FAILED') && line.includes('Chrome Headless')) {
      // Check if this failure is from our file by looking at the next few lines
      let isOurFile = false;
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        if (lines[j].includes(filePath)) {
          isOurFile = true;
          break;
        }
        // Stop if we hit another test or execution summary
        if (lines[j].includes('Chrome Headless') && (lines[j].includes('FAILED') || lines[j].includes('Executed'))) {
          break;
        }
      }
      
      if (isOurFile) {
        inRelevantSection = true;
        filteredLines.push(line);
      } else {
        inRelevantSection = false;
      }
      continue;
    }
    
    // Execution summary line - check if it's for our file
    if (line.includes('Executed') && line.includes('Chrome Headless')) {
      // Only include if it mentions our file or if we're in a relevant section
      if (inRelevantSection || line.includes(filePath)) {
        filteredLines.push(line);
      }
      inRelevantSection = false;
      continue;
    }
    
    // If we're in a relevant section, capture the error details
    if (inRelevantSection) {
      // Skip lines that reference other spec files
      if (line.includes('.spec.ts') && !line.includes(filePath)) {
        inRelevantSection = false;
        continue;
      }
      
      filteredLines.push(line);
    }
  }
  
  // If no file-specific errors found, return the full error
  if (filteredLines.length <= 1) {
    return fullError;
  }
  
  return filteredLines.join('\n');
}

/**
 * Loads test cache from .vscode/.turbo-cache.json
 * 
 * Cache structure:
 * {
 *   "file.spec.ts": {
 *     "hash": "abc123...",
 *     "status": "passed",
 *     "timestamp": 1234567890,
 *     "error": "error message if failed"
 *   }
 * }
 * 
 * @returns {Object} Cache object with file paths as keys
 */
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cacheData = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(cacheData);
    }
  } catch (error) {
    console.warn(colorize('⚠️  Failed to load cache, starting fresh', 'yellow'));
  }
  return {};
}

/**
 * Saves test cache to .vscode/.turbo-cache.json
 * 
 * @param {Object} cache - Cache object to save
 */
function saveCache(cache) {
  try {
    // Ensure .vscode directory exists
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.warn(colorize('⚠️  Failed to save cache', 'yellow'));
  }
}

/**
 * Clears the test cache file
 */
function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log(colorize('🗑️  Cache cleared', 'green'));
    }
  } catch (error) {
    console.warn(colorize('⚠️  Failed to clear cache', 'yellow'));
  }
}

/**
 * Generates hash for a file's content
 * 
 * @param {string} filePath - Path to file
 * @returns {string} MD5 hash of file content
 */
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

/**
 * Detects changes in git status using porcelain format
 * 
 * Runs: git status --porcelain
 * Returns array of changed files with their status and type
 * 
 * @returns {Array} Array of change objects: { status, file, type }
 *   - status: Git status code (e.g., 'M ', 'A ', 'D ', '??')
 *   - file: Relative file path
 *   - type: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
 */
function detectGitChanges() {
  try {
    // Get git status in porcelain format
    const statusOutput = execSync('git status --porcelain', {
      encoding: 'utf-8',
    }).trim();

    const changes = [];

    if (statusOutput) {
      const lines = statusOutput.split('\n');

      lines.forEach((line) => {
        if (!line) return;

        const status = line.substring(0, 2);
        // Git porcelain format: [staged][unstaged] [space] [filename]
        // Skip first 2 chars (status) and trim leading whitespace
        const file = line.substring(2).trim();

        let type = 'modified';
        if (status[0] === 'A' || status === 'A ') type = 'added';
        else if (status[0] === 'D' || status === 'D ') type = 'deleted';
        else if (status[0] === 'R' || status === 'R ') type = 'renamed';
        else if (status === '??') type = 'untracked';

        if (file) {
          changes.push({ status, file, type });
        }
      });
    }

    return changes;
  } catch (error) {
    console.error(colorize('❌ Error detecting git changes:', 'red'), error);
    return [];
  }
}

/**
 * Filters changed files to extract only .spec.ts test files
 * 
 * Also automatically includes .spec.ts files for any changed .component.ts files
 * Used to determine which tests to run with ng test --include
 * Caches both passed and failed tests - only reruns when file changes
 * 
 * @param {Array} changes - Array of change objects from detectGitChanges()
 * @param {Object} cache - Cache object from loadCache()
 * @returns {Object} Object with { toRun: [], cached: [] }
 */
function getSpecFiles(changes, cache = {}) {
  const allSpecFiles = new Set();
  
  changes.forEach((change) => {
    const file = change.file;
    
    // Add explicit .spec.ts files
    if (file.endsWith('.spec.ts')) {
      allSpecFiles.add(file);
    }
    
    // If a .ts file changed (not spec), add its corresponding .spec.ts
    if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
      const specFile = file.replace('.ts', '.spec.ts');
      allSpecFiles.add(specFile);
    }
  });
  
  // Filter to only files that exist
  const existingSpecFiles = Array.from(allSpecFiles).filter((file) => {
    try {
      execSync(`test -f "${file}"`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });

  // Separate files into toRun and cached
  const toRun = [];
  const cached = [];

  existingSpecFiles.forEach((file) => {
    const currentHash = getFileHash(file);
    const cachedEntry = cache[file];
    
    // Also check if the source file (.ts) changed
    const sourceFile = file.replace('.spec.ts', '.ts');
    const sourceHash = getFileHash(sourceFile);
    const cachedSourceEntry = cache[`source:${sourceFile}`];

    // Run if: no cache OR spec hash changed OR source hash changed
    const specChanged = !cachedEntry || cachedEntry.hash !== currentHash;
    // Only check source changes if source file exists
    const sourceChanged = sourceHash !== null && (!cachedSourceEntry || cachedSourceEntry.hash !== sourceHash);
    const shouldRun = specChanged || sourceChanged;

    if (shouldRun) {
      toRun.push(file);
    } else {
      cached.push(file);
    }
  });

  return { toRun, cached };
}

/**
 * Generates ESLint command for changed .ts and .html files with caching
 * 
 * Features:
 * - Filters to .ts and .html files
 * - Uses cache to skip unchanged files (both passed and failed)
 * - Only re-runs when file hash changes
 * - Applies --fix flag to auto-fix fixable issues
 * - Uses --cache for faster subsequent runs
 * - Displays tree-style file listing in cyan
 * - Shows cached files separately
 * 
 * @param {Array} changes - Array of change objects from detectGitChanges()
 * @param {Object} cache - Cache object from loadCache()
 * @returns {Object} Object with { command: string|null, toRun: [], cached: [] }
 */
function generateLintCommand(changes, cache = {}) {
  if (changes.length === 0) {
    return { command: null, toRun: [], cached: [] };
  }
  
  const allFilesToLint = new Set();
  
  changes.forEach((change) => {
    const file = change.file;
    
    if (file.endsWith('.html') || file.endsWith('.ts')) {
      allFilesToLint.add(file);
    }
  });
  
  if (allFilesToLint.size === 0) {
    return { command: null, toRun: [], cached: [] };
  }

  // Separate files into toRun and cached
  const toRun = [];
  const cached = [];

  Array.from(allFilesToLint).forEach((file) => {
    const currentHash = getFileHash(file);
    const cacheKey = `lint:${file}`;
    const cachedEntry = cache[cacheKey];

    // Run if: no cache OR hash changed
    // Skip if: cached AND hash unchanged (regardless of pass/fail status)
    const shouldRun = !cachedEntry || cachedEntry.hash !== currentHash;

    if (shouldRun) {
      toRun.push(file);
    } else {
      cached.push(file);
    }
  });

  if (cached.length > 0) {
    console.log(colorize('💾 Lint Cached (skipped):', 'cyan'));
    cached.forEach((file) => {
      console.log(colorize(`  ├─ ${file}`, 'dim'));
    });
  }

  if (toRun.length === 0) {
    return { command: null, toRun, cached,allFilesToLint };
  }
  
  console.log(colorize('📝 Linting files:', 'cyan'));
  toRun.forEach((file) => {
    console.log(colorize(`  ├─ ${file}`, 'dim'));
  });
  
  const filesList = toRun.join(' ');
  return { 
    command: `npx eslint ${filesList} --fix`,
    toRun,
    cached,
    allFilesToLint
  };
}

/**
 * Generates ng test command for changed spec files
 * 
 * Features:
 * - Uses --include parameter to run only changed .spec.ts files
 * - Runs with --watch=false for CI/CD compatibility
 * - Generates code coverage reports
 * - Uses karma-parallel.conf.js for parallel test execution
 * - Displays tree-style file listing in magenta
 * - Shows cached files separately
 * - If no tests to run, returns a build-only command to check compile errors
 * 
 * @param {Array} specFiles - Array of .spec.ts file paths to run
 * @param {Array} cachedFiles - Array of cached .spec.ts file paths
 * @returns {string|null} ng test command string or null if no spec files
 */
function generateNgTestCommand(specFiles, cachedFiles = [],lintResult= {}) {
  if (specFiles.length === 0 && cachedFiles.length === 0) {
    return null;
  }

  if (cachedFiles.length > 0) {
    console.log(colorize('💾 Cached (skipped):', 'cyan'));
    cachedFiles.forEach((file) => {
      console.log(colorize(`  ├─ ${file}`, 'dim'));
    });
  }

  // If no tests to run but there are cached tests, don't run smoke test
  // The cached tests are already verified
  if (specFiles.length === 0) {
    return null;
  }

  console.log(colorize('🧪 Testing files:', 'magenta'));
  specFiles.forEach((file) => {
    console.log(colorize(`  ├─ ${file}`, 'dim'));
  });
  const includePattern = specFiles.map((file) => `--include=${file}`).join(' ');
  return `ng test ${includePattern} --watch=false --karma-config=karma-parallel.conf.js`;
}

/**
 * Executes lint and test commands in parallel using Node.js spawn()
 * 
 * Features:
 * - True parallel execution (both processes run simultaneously)
 * - Real-time console output from both processes
 * - Tracks completion of each process
 * - Displays results summary with pass/fail status
 * - Shows total execution time
 * - Exits with code 1 if any process fails, 0 if all pass
 * - Supports --disable-lint flag to skip linting
 * - Supports --disable-cache flag to ignore cache and run all tests
 * - Smart caching: only retests/relints changed files
 * 
 * @param {Array} changes - Array of change objects from detectGitChanges()
 * @param {boolean} disableLint - If true, skips linting and runs only tests (default: false)
 * @param {boolean} disableCache - If true, ignores cache and runs all tests (default: false)
 */
function executeParallelCommands(changes, disableLint = false, disableCache = false) {
  const startTime = Date.now();
  const cache = disableCache ? {} : loadCache();
  const { toRun: specFilesToRun, cached: cachedSpecFiles } = getSpecFiles(changes, disableCache ? {} : cache);
  
  const lintResult = disableLint ? { command: null, toRun: [], cached: [] } : generateLintCommand(changes, disableCache ? {} : cache);
  const testCmd = generateNgTestCommand(specFilesToRun, disableCache ? [] : cachedSpecFiles , lintResult);
  
  // If all tests and lints are cached, show success
  if (!lintResult.command && !testCmd && (cachedSpecFiles.length > 0 || lintResult.cached.length > 0)) {
    console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue'));
    console.log(colorize('✨ TURBO TEST - All cached!', 'bright'));
    console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue'));
    
    if (lintResult.cached.length > 0) {
      // Count passed vs failed lint files
      const lintPassedFiles = [];
      const lintFailedFiles = [];
      
      lintResult.cached.forEach(file => {
        const entry = cache[`lint:${file}`];
        if (entry && entry.status === 'passed') {
          lintPassedFiles.push(file);
        } else if (entry && entry.status === 'failed') {
          lintFailedFiles.push({ file, error: entry.error });
        }
      });
      
      if (lintPassedFiles.length > 0 && lintFailedFiles.length === 0) {
        console.log(colorize(`💾 ${lintPassedFiles.length} lint file(s) cached (all passing)`, 'green'));
      } else if (lintPassedFiles.length > 0 && lintFailedFiles.length > 0) {
        console.log(colorize(`💾 ${lintResult.cached.length} lint file(s) cached (${lintPassedFiles.length} passing, ${lintFailedFiles.length} failing)`, 'yellow'));
        lintFailedFiles.forEach(({ file, error }) => {
          console.log(colorize(`   ❌ ${file}`, 'red'));
          if (error) {
            const errorLines = error.split('\n');
            errorLines.forEach(line => console.log(colorize(`      ${line}`, 'dim')));
          }
        });
      } else {
        console.log(colorize(`💾 ${lintFailedFiles.length} lint file(s) cached (all failing)`, 'red'));
        lintFailedFiles.forEach(({ file, error }) => {
          console.log(colorize(`   ❌ ${file}`, 'red'));
          if (error) {
            const errorLines = error.split('\n');
            errorLines.forEach(line => console.log(colorize(`      ${line}`, 'dim')));
          }
        });
      }
    }
    
    if (cachedSpecFiles.length > 0) {
      // Count passed vs failed test files
      const testPassedFiles = [];
      const testFailedFiles = [];
      
      cachedSpecFiles.forEach(file => {
        const entry = cache[file];
        if (entry && entry.status === 'passed') {
          testPassedFiles.push(file);
        } else if (entry && entry.status === 'failed') {
          testFailedFiles.push({ file, error: entry.error });
        }
      });
      
      if (testPassedFiles.length > 0 && testFailedFiles.length === 0) {
        console.log(colorize(`💾 ${testPassedFiles.length} test(s) cached (all passing)`, 'green'));
      } else if (testPassedFiles.length > 0 && testFailedFiles.length > 0) {
        console.log(colorize(`💾 ${cachedSpecFiles.length} test(s) cached (${testPassedFiles.length} passing, ${testFailedFiles.length} failing)`, 'yellow'));
        testFailedFiles.forEach(({ file, error }) => {
          console.log(colorize(`   ❌ ${file}`, 'red'));
          if (error) {
            const errorLines = error.split('\n');
            errorLines.forEach(line => console.log(colorize(`      ${line}`, 'dim')));
          }
        });
      } else {
        console.log(colorize(`💾 ${testFailedFiles.length} test(s) cached (all failing)`, 'red'));
        testFailedFiles.forEach(({ file, error }) => {
          console.log(colorize(`   ❌ ${file}`, 'red'));
          if (error) {
            const errorLines = error.split('\n');
            errorLines.forEach(line => console.log(colorize(`      ${line}`, 'dim')));
          }
        });
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(colorize(`⏱️  Total time: ${duration}s`, 'cyan'));
    console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue'));
    return;
  }
  
  if (!lintResult.command && !testCmd) {
    console.log(colorize('⚠️  No files found to process.', 'yellow'));
    return;
  }
  
  console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue'));
  console.log(colorize('🚀 TURBO TEST - Running in parallel...', 'bright'));
  console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue'));
  
  const processes = [];
  let completed = 0;
  let failed = false;
  const results = {};
  const failureReasons = {};
  const errorOutputs = {};
  const filesToCache = {
    lint: lintResult.toRun,
    test: specFilesToRun
  };
  
  // Helper function to kill all processes and their children
  const killAllProcesses = () => {
    processes.forEach(({ process: proc }) => {
      if (proc && !proc.killed) {
        try {
          // On Windows, use taskkill to kill process tree
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${proc.pid} /t /f`, { stdio: 'ignore' });
          } else {
            // On Unix, kill the process group
            process.kill(-proc.pid, 'SIGKILL');
          }
        } catch (e) {
          // Ignore errors if process already terminated
        }
      }
    });
  };
  
  // Start lint process
  if (lintResult.command) {
    console.log(colorize('▶️  [1/2] Starting Lint...', 'yellow'));
    console.log(colorize(`   Command: ${lintResult.command}`, 'dim'));
    const lintProcess = spawn(lintResult.command, { stdio: 'pipe', shell: true });
    errorOutputs['Lint'] = '';
    
    lintProcess.stderr.on('data', (data) => {
      errorOutputs['Lint'] += data.toString();
      process.stderr.write(data);
    });
    
    lintProcess.stdout.on('data', (data) => {
      const output = data.toString();
      errorOutputs['Lint'] += output;
      process.stdout.write(data);
    });
    
    processes.push({ name: 'Lint', process: lintProcess });
  }
  
  // Start test process
  if (testCmd) {
    console.log(colorize(`▶️  [${lintResult.command ? '2/2' : '1/1'}] Starting Tests...`, 'yellow'));
    console.log(colorize(`   Command: ${testCmd}`, 'dim'));
    const testProcess = spawn(testCmd, { stdio: 'pipe', shell: true });
    errorOutputs['Test'] = '';
    
    testProcess.stderr.on('data', (data) => {
      errorOutputs['Test'] += data.toString();
      process.stderr.write(data);
    });
    
    testProcess.stdout.on('data', (data) => {
      const output = data.toString();
      errorOutputs['Test'] += output;
      process.stdout.write(data);
    });
    
    processes.push({ name: 'Test', process: testProcess });
  }
  
  console.log('');
  
  // Wait for all processes to complete
  processes.forEach(({ name, process: proc }) => {
    proc.on('close', (code) => {
      completed++;
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (code !== 0) {
        failed = true;
        results[name] = 'FAILED';
        const errorMsg = errorOutputs[name]?.trim() || `Process exited with code ${code}`;
        
        // For tests, try to extract test summary (TOTAL, FAILED, SUCCESS)
        if (name === 'Test') {
          const summaryMatch = errorMsg.match(/TOTAL:\s*(\d+)\s*FAILED,\s*(\d+)\s*SUCCESS/);
          
          if (summaryMatch) {
            const failedCount = summaryMatch[1];
            const successCount = summaryMatch[2];
            const total = Number.parseInt(failedCount) + Number.parseInt(successCount);
            
            // Extract complete error section - everything from first FAILED to TOTAL summary
            const lines = errorMsg.split('\n');
            const errorSection = [];
            let captureErrors = false;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              // Start capturing when we see first FAILED test
              if (line.includes('FAILED') && !line.includes('Coverage') && !line.includes('TOTAL:') && !captureErrors) {
                captureErrors = true;
              }
              
              // Stop capturing when we hit the final TOTAL summary or Coverage
              if (captureErrors && (line.includes('TOTAL:') || line.includes('Coverage summary'))) {
                break;
              }
              
              // Capture all lines in the error section
              if (captureErrors) {
                errorSection.push(line);
              }
            }
            
            // Build the complete error message
            let summary = `TOTAL: ${total}, FAILED: ${failedCount}, SUCCESS: ${successCount}`;
            if (errorSection.length > 0) {
              summary += '\n' + errorSection.join('\n');
            }
            
            failureReasons[name] = summary;
          } else {
            // Check for TypeScript compilation errors
            const hasCompilationError = errorMsg.includes('[ERROR] TS') || errorMsg.includes('Application bundle generation failed');
            
            if (hasCompilationError) {
              // Extract TS error messages - simpler approach
              const tsErrorLines = [];
              const lines = errorMsg.split('\n');
              
              // Debug: log first few lines to see format
              // console.log('DEBUG - First 20 lines:');
              // lines.slice(0, 20).forEach((l, i) => console.log(`${i}: ${l}`));
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Look for lines containing [ERROR] TS
                if (line.includes('[ERROR] TS')) {
                  // Extract everything after [ERROR]
                  const errorIdx = line.indexOf('[ERROR]');
                  const errorPart = line.substring(errorIdx + 8).trim();
                  // Remove [plugin ...] suffix if present
                  const cleanError = errorPart.replace(/\s*\[plugin.*?\]\s*$/, '').trim();
                  if (cleanError) {
                    tsErrorLines.push(cleanError);
                  }
                  
                  // Get the file location from next few lines
                  for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                    const nextLine = lines[j].trim();
                    // Look for file path pattern (src/...)
                    if (nextLine.startsWith('src/') && nextLine.includes(':')) {
                      const filePath = nextLine.split(':').slice(0, 3).join(':');
                      tsErrorLines.push(`  at ${filePath}`);
                      break;
                    }
                  }
                  
                  // Limit to first 3 errors
                  if (tsErrorLines.length >= 6) break;
                }
              }
              
              if (tsErrorLines.length > 0) {
                failureReasons[name] = tsErrorLines.join('\n');
              } else {
                // Fallback: just show first few error lines
                const errorLines = lines.filter(l => l.includes('ERROR') || l.includes('src/')).slice(0, 5);
                failureReasons[name] = errorLines.length > 0 ? errorLines.join('\n') : 'Compilation failed - check TypeScript errors';
              }
            } else {
              // Test output doesn't have expected summary format - something went wrong
              const errorLines = errorMsg.split('\n').filter(line => line.trim() && !line.includes('Building'));
              
              // Check if output looks incomplete (ends with "Building..." or similar)
              if (errorMsg.includes('Building') || errorLines.length === 0) {
                failureReasons[name] = 'Test execution incomplete or interrupted';
              } else {
                // Extract meaningful error lines
                const summary = errorLines.slice(-5).join('\n');
                failureReasons[name] = summary || 'Test execution failed - no summary found';
              }
            }
          }
          
          // Cache failed tests too (so we don't retry until file changes)
          // BUT skip caching if test was interrupted/incomplete
          const shouldCache = failureReasons[name] && !failureReasons[name].includes('Test execution incomplete or interrupted');
          
          if (shouldCache) {
            // For compilation errors, only cache files that are explicitly mentioned in the error
            const hasCompilationError = errorMsg.includes('[ERROR] TS') || errorMsg.includes('Application bundle generation failed');
            
            if (hasCompilationError) {
              // Extract all file paths mentioned in the error message
              const errorLines = errorMsg.split('\n');
              const filesInError = new Set();
              
              errorLines.forEach(line => {
                // Match file paths in format: src/path/to/file.ts or src/path/to/file.spec.ts
                const fileMatch = line.match(/(src\/[^\s:]+\.(?:spec\.)?ts)/g);
                if (fileMatch) {
                  fileMatch.forEach(f => filesInError.add(f));
                }
              });
              
              // Only cache files that are mentioned in the error AND are in our test list
              filesToCache.test.forEach((file) => {
                if (filesInError.has(file)) {
                  const hash = getFileHash(file);
                  if (hash) {
                    const fileSpecificError = filterErrorsByFile(failureReasons[name] || 'Test failed', file);
                    
                    cache[file] = {
                      hash,
                      status: 'failed',
                      timestamp: Date.now(),
                      error: fileSpecificError,
                    };
                  }
                  
                  // Also cache the source file hash
                  const sourceFile = file.replace('.spec.ts', '.ts');
                  const sourceHash = getFileHash(sourceFile);
                  if (sourceHash) {
                    cache[`source:${sourceFile}`] = {
                      hash: sourceHash,
                      status: 'failed',
                      timestamp: Date.now(),
                    };
                  }
                }
              });
            } else {
              // For regular test failures, cache all files as before
              filesToCache.test.forEach((file) => {
                const hash = getFileHash(file);
                if (hash) {
                  // Filter error message to only include errors from this specific file
                  const fullError = failureReasons[name] || 'Test failed';
                  const fileSpecificError = filterErrorsByFile(fullError, file);
                  
                  cache[file] = {
                    hash,
                    status: 'failed',
                    timestamp: Date.now(),
                    error: fileSpecificError,
                  };
                }
                
                // Also cache the source file hash
                const sourceFile = file.replace('.spec.ts', '.ts');
                const sourceHash = getFileHash(sourceFile);
                if (sourceHash) {
                  cache[`source:${sourceFile}`] = {
                    hash: sourceHash,
                    status: 'failed',
                    timestamp: Date.now(),
                  };
                }
              });
            }
            saveCache(cache);
          }
        } else {
          // For lint, extract error details
          const errorLines = errorMsg.split('\n').filter(line => line.trim());
          
          // Find lines with actual errors (containing "error" or "warning")
          const errorDetailLines = errorLines.filter(line => 
            line.includes('error') || 
            line.includes('warning') || 
            line.includes('✖') ||
            line.match(/^\d+:\d+/)  // Line:column format
          );
          
          // If we found specific errors, show them; otherwise show last few lines
          const summary = errorDetailLines.length > 0 
            ? errorDetailLines.join('\n')
            : errorLines.slice(-5).join('\n');
          
          failureReasons[name] = summary;
          
          // For lint, we need to parse which specific files failed
          // Extract file paths from error output (format: "path/to/file.ts")
          const failedFiles = new Set();
          errorLines.forEach(line => {
            // Match file paths in error output
            const fileMatch = line.match(/([A-Z]:\\[^:]+\.ts|src\/[^:]+\.ts)/);
            if (fileMatch) {
              // Normalize path to relative format
              let filePath = fileMatch[1];
              if (filePath.includes('\\')) {
                // Convert Windows path to relative
                const parts = filePath.split('\\');
                const srcIndex = parts.findIndex(p => p === 'src');
                if (srcIndex >= 0) {
                  filePath = parts.slice(srcIndex).join('/');
                }
              }
              failedFiles.add(filePath);
            }
          });
          
          // Cache lint results - only mark files as failed if they're in the error output
          filesToCache.lint.forEach((file) => {
            const hash = getFileHash(file);
            if (hash) {
              const hasFailed = failedFiles.has(file);
              cache[`lint:${file}`] = {
                hash,
                status: hasFailed ? 'failed' : 'passed',
                timestamp: Date.now(),
                error: hasFailed ? failureReasons[name] : undefined,
              };
            }
          });
          saveCache(cache);
        }
        
        console.error(colorize(`\n❌ ${name} failed`, 'red'));
        
        // Kill all other processes immediately on failure
        console.log(colorize('🛑 Stopping all processes...', 'yellow'));
        killAllProcesses();
      } else {
        results[name] = 'PASSED';
        console.log(colorize(`\n✅ ${name} completed successfully`, 'green'));

        // Update cache for passed files
        if (name === 'Lint' && filesToCache.lint.length > 0) {
          filesToCache.lint.forEach((file) => {
            const hash = getFileHash(file);
            if (hash) {
              cache[`lint:${file}`] = {
                hash,
                status: 'passed',
                timestamp: Date.now(),
              };
            }
          });
          saveCache(cache);
        } else if (name === 'Test' && filesToCache.test.length > 0) {
          filesToCache.test.forEach((file) => {
            const hash = getFileHash(file);
            if (hash) {
              cache[file] = {
                hash,
                status: 'passed',
                timestamp: Date.now(),
              };
            }
            
            // Also cache the source file hash
            const sourceFile = file.replace('.spec.ts', '.ts');
            const sourceHash = getFileHash(sourceFile);
            if (sourceHash) {
              cache[`source:${sourceFile}`] = {
                hash: sourceHash,
                status: 'passed',
                timestamp: Date.now(),
              };
            }
          });
          saveCache(cache);
        }
      }
      
      // Exit when all processes are done
      if (completed === processes.length) {
        console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue'));
        console.log(colorize('📊 RESULTS:', 'bright'));
        Object.entries(results).forEach(([name, status]) => {
          const icon = status === 'PASSED' ? '✅' : '❌';
          const color = status === 'PASSED' ? 'green' : 'red';
          console.log(colorize(`  ${icon} ${name}: ${status}`, color));
          if (failureReasons[name]) {
            // Check if this is a killed process (no meaningful output)
            const reason = failureReasons[name];
            if (reason.includes('incomplete') || reason.includes('interrupted') || reason.length < 20) {
              console.log(colorize(`     └─ ⚠️  ${reason}`, 'yellow'));
            } else if (reason.includes('TOTAL:')) {
              // This is a proper test summary
              console.log(colorize(`     └─ ${reason}`, 'dim'));
            } else {
              console.log(colorize(`     └─ ${reason}`, 'dim'));
            }
          }
        });
        
        // Show cache stats
        if (lintResult.cached.length > 0) {
          // Count passed vs failed lint files
          const lintPassedFiles = [];
          const lintFailedFiles = [];
          
          lintResult.cached.forEach(file => {
            const entry = cache[`lint:${file}`];
            if (entry && entry.status === 'passed') {
              lintPassedFiles.push(file);
            } else if (entry && entry.status === 'failed') {
              lintFailedFiles.push({ file, error: entry.error });
            }
          });
          
          if (lintPassedFiles.length > 0 && lintFailedFiles.length === 0) {
            console.log(colorize(`💾 Lint Cached: ${lintPassedFiles.length} file(s) skipped (all passing)`, 'cyan'));
          } else if (lintPassedFiles.length > 0 && lintFailedFiles.length > 0) {
            console.log(colorize(`💾 Lint Cached: ${lintResult.cached.length} file(s) skipped (${lintPassedFiles.length} passing, ${lintFailedFiles.length} failing)`, 'yellow'));
            lintFailedFiles.forEach(({ file, error }) => {
              console.log(colorize(`   ❌ ${file}`, 'red'));
              if (error) {
                const errorLines = error.split('\n');
                errorLines.forEach(line => console.log(colorize(`      ${line}`, 'dim')));
              }
            });
          } else {
            console.log(colorize(`💾 Lint Cached: ${lintFailedFiles.length} file(s) skipped (all failing)`, 'red'));
            lintFailedFiles.forEach(({ file, error }) => {
              console.log(colorize(`   ❌ ${file}`, 'red'));
              if (error) {
                const errorLines = error.split('\n');
                errorLines.forEach(line => console.log(colorize(`      ${line}`, 'dim')));
              }
            });
          }
        }
        
        if (cachedSpecFiles.length > 0) {
          // Count passed vs failed test files
          const testPassedFiles = [];
          const testFailedFiles = [];
          
          cachedSpecFiles.forEach(file => {
            const entry = cache[file];
            if (entry && entry.status === 'passed') {
              testPassedFiles.push(file);
            } else if (entry && entry.status === 'failed') {
              testFailedFiles.push({ file, error: entry.error });
            }
          });
          
          if (testPassedFiles.length > 0 && testFailedFiles.length === 0) {
            console.log(colorize(`💾 Test Cached: ${testPassedFiles.length} test(s) skipped (all passing)`, 'cyan'));
          } else if (testPassedFiles.length > 0 && testFailedFiles.length > 0) {
            console.log(colorize(`💾 Test Cached: ${cachedSpecFiles.length} test(s) skipped (${testPassedFiles.length} passing, ${testFailedFiles.length} failing)`, 'yellow'));
            testFailedFiles.forEach(({ file, error }) => {
              console.log(colorize(`   ❌ ${file}`, 'red'));
              if (error) {
                const errorLines = error.split('\n');
                errorLines.forEach(line => console.log(colorize(`      ${line}`, 'dim')));
              }
            });
          } else {
            console.log(colorize(`💾 Test Cached: ${testFailedFiles.length} test(s) skipped (all failing)`, 'red'));
            testFailedFiles.forEach(({ file, error }) => {
              console.log(colorize(`   ❌ ${file}`, 'red'));
              if (error) {
                const errorLines = error.split('\n');
                errorLines.forEach(line => console.log(colorize(`      ${line}`, 'dim')));
              }
            });
          }
        }
        
        console.log(colorize(`⏱️  Total time: ${duration}s`, 'cyan'));
        console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue'));
        
        if (failed) {
          process.exit(1);
        }
      }
    });
  });
}

// CLI execution
// Parses command line arguments and runs the turbo test workflow
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue'));
    console.log(colorize('🚀 TURBO TEST - Parallel Lint & Test Runner with Smart Caching', 'bright'));
    console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue'));
    console.log(colorize('USAGE:', 'bright'));
    console.log('  npm run turbo                     # Run lint and test with caching');
    console.log('  npm run turbo -- --disable-lint   # Skip linting, run only tests');
    console.log('  npm run turbo -- --disable-cache  # Ignore cache, run all tests');
    console.log('  npm run turbo -- --clear-cache    # Clear cache and run all tests');
    console.log('  npm run turbo -- --help           # Show this help message\n');
    console.log(colorize('FEATURES:', 'bright'));
    console.log('  ✓ Parallel execution (lint + test run simultaneously)');
    console.log('  ✓ Smart caching (only re-runs changed files)');
    console.log('  ✓ Fast feedback (kills all on first failure)');
    console.log('  ✓ Detailed error messages with stack traces');
    console.log('  ✓ Color-coded output for easy scanning\n');
    console.log(colorize('CACHE:', 'bright'));
    console.log('  Cache file: .vscode/.turbo-cache.json');
    console.log('  Tracks both passing and failing tests');
    console.log('  Invalidates on file content changes\n');
    console.log(colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue'));
    process.exit(0);
  }
  
  const disableLint = args.includes('--disable-lint');
  const shouldClearCache = args.includes('--clear-cache');
  const disableCache = args.includes('--disable-cache');
  
  if (shouldClearCache) {
    clearCache();
  }
  
  const changes = detectGitChanges();
  // Debug: log actual file paths
  if (args.includes('--debug')) {
    console.log('DEBUG - Detected changes:');
    changes.forEach(c => console.log(`  ${c.file}`));
  }
  executeParallelCommands(changes, disableLint, disableCache);
}

module.exports = {
  detectGitChanges,
  getSpecFiles,
  generateLintCommand,
  generateNgTestCommand,
  executeParallelCommands,
  loadCache,
  saveCache,
  clearCache,
  getFileHash,
};
