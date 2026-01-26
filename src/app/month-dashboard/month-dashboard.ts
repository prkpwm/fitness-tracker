import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../services/data.service';
import { FitnessData } from '../models/fitness.model';
import { MessageDialogComponent } from '../components/message-dialog.component';
import { Chart, registerables } from 'chart.js';

interface MonthlyStats {
  totalDays: number;
  activeDays: number;
  avgCalories: number;
  avgProtein: number;
  totalBurned: number;
  bestDay: string;
  worstDay: string;
}

@Component({
  selector: 'app-month-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './month-dashboard.html',
  styleUrls: ['./month-dashboard.css']
})
export class MonthDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('calorieChart', { static: false }) calorieChart!: ElementRef<HTMLCanvasElement>;
  private chart: Chart<'line'> | null = null;
  private chartInitialized = false;
  
  currentMonth = new Date();
  monthlyData: FitnessData[] = [];
  loading = false;
  monthlyStats: MonthlyStats = {
    totalDays: 0,
    activeDays: 0,
    avgCalories: 0,
    avgProtein: 0,
    totalBurned: 0,
    bestDay: '',
    worstDay: ''
  };
  calendarDays: any[] = [];

  constructor(private dataService: DataService, private router: Router, private route: ActivatedRoute, private dialog: MatDialog) {
    Chart.register(...registerables);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['year'] && params['month'] !== undefined) {
        this.currentMonth = new Date(Number.parseInt(params['year']), Number.parseInt(params['month']), 1);
      }
      this.loadMonthlyData();
    });

    // Subscribe to data updates from API
    this.dataService.dataUpdate$.subscribe(() => {
      this.loadMonthlyData();
    });
  }

  loadMonthlyData() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Reset data and stats
    this.monthlyData = [];
    this.monthlyStats = {
      totalDays: 0,
      activeDays: 0,
      avgCalories: 0,
      avgProtein: 0,
      totalBurned: 0,
      bestDay: '',
      worstDay: ''
    };

    this.loading = true;
    this.dataService.getFitnessDataByMonth(year, month + 1).subscribe({
      next: (allData) => {
        // Data is already filtered for current month
        this.monthlyData = allData;
        this.calculateStats();
        this.generateCalendar();
        if (!this.chartInitialized) {
          setTimeout(() => {
            this.createChart();
          }, 100);
        }
        this.loading = false;
      },
      error: () => {
        this.monthlyData = [];
        this.calculateStats();
        this.generateCalendar();
        this.createChart();
        this.loading = false;
      }
    });
  }

  calculateStats() {
    if (this.monthlyData.length === 0) return;

    this.monthlyStats.activeDays = this.monthlyData.length;
    this.monthlyStats.totalDays = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0).getDate();
    
    const totalCalories = this.monthlyData.reduce((sum, data) => sum + data.daily_total_stats.total_intake_calories, 0);
    const totalProtein = this.monthlyData.reduce((sum, data) => sum + data.daily_total_stats.total_protein_g, 0);
    this.monthlyStats.totalBurned = this.monthlyData.reduce((sum, data) => sum + data.exercise_summary?.total_burned_calories || 0, 0);
    
    this.monthlyStats.avgCalories = Math.round(totalCalories / this.monthlyStats.activeDays);
    this.monthlyStats.avgProtein = Math.round(totalProtein / this.monthlyStats.activeDays);

    // Find best and worst days
    let bestData = this.monthlyData[0];
    let worstData = this.monthlyData[0];
    
    this.monthlyData.forEach(data => {
      if (data.daily_total_stats.total_intake_calories > bestData.daily_total_stats.total_intake_calories) {
        bestData = data;
      }
      if (data.daily_total_stats.total_intake_calories < worstData.daily_total_stats.total_intake_calories) {
        worstData = data;
      }
    });
    
    this.monthlyStats.bestDay = new Date(bestData.date).getDate().toString();
    this.monthlyStats.worstDay = new Date(worstData.date).getDate().toString();
  }

  generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    this.calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push({ day: '', data: null, isEmpty: true });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Create date string in YYYY-MM-DD format
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = this.monthlyData.find(data => data.date === dateStr);
      
      this.calendarDays.push({
        day: day,
        data: dayData,
        isEmpty: false,
        hasData: !!dayData,
        status: dayData ? this.getStatusClass(dayData) : 'no-data'
      });
    }
  }

  getStatusClass(data: FitnessData): string {
    const netCal = data.daily_total_stats.net_calories;
    if (netCal < 0) return 'deficit';
    if (netCal > 200) return 'surplus';
    return 'maintenance';
  }

  changeMonth(direction: number) {
    this.chartInitialized = false;
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + direction, 1);
    this.loadMonthlyData();
  }

  getMonthName(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  getCompletionRate(): number {
    return Math.round((this.monthlyStats.activeDays / this.monthlyStats.totalDays) * 100);
  }

  onDateClick(day: any) {
    if (!day.isEmpty) {
      const year = this.currentMonth.getFullYear();
      const month = this.currentMonth.getMonth();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
      
      // Navigate to daily view with the selected date
      this.router.navigate(['/daily'], { queryParams: { date: dateStr } });
    }
  }

  getRecommendedCalories(): number {
    return this.monthlyData.length > 0 ? this.monthlyData[0].user_profile.goal_calories : 0;
  }

  getAvgNetCalories(): number {
    if (this.monthlyData.length === 0) return 0;
    const totalNet = this.monthlyData.reduce((sum, data) => sum + data.daily_total_stats.net_calories, 0);
    return Math.round(totalNet / this.monthlyData.length);
  }

  getCalorieDifference(): number {
    return this.getAvgNetCalories() - this.getRecommendedCalories();
  }

  getDifferenceClass(): string {
    const diff = this.getCalorieDifference();
    return diff < 0 ? 'good' : diff > 200 ? 'high' : 'moderate';
  }

  getNetCalorieRecommendation(): string {
    const diff = this.getCalorieDifference();
    if (diff < -200) return 'Excellent deficit for weight loss';
    if (diff < 0) return 'Good deficit maintained';
    if (diff <= 200) return 'Near maintenance calories';
    return 'High surplus - consider reducing intake';
  }

  getTotalCalories(): number {
    return this.monthlyData.reduce((sum, data) => sum + data.daily_total_stats.total_intake_calories, 0);
  }

  getEstimatedWeightDecrease(): number {
    const totalDeficit = Math.abs(this.getCalorieDifference()) * this.monthlyStats.activeDays;
    return totalDeficit > 0 ? Math.round((totalDeficit / 7700) * 10) / 10 : 0; // 7700 cal = 1kg
  }

  getMinCalories(): number {
    return this.monthlyData.length > 0 ? Math.min(...this.monthlyData.map(d => d.daily_total_stats.total_intake_calories)) : 0;
  }

  getMaxCalories(): number {
    return this.monthlyData.length > 0 ? Math.max(...this.monthlyData.map(d => d.daily_total_stats.total_intake_calories)) : 0;
  }

  getMinProtein(): number {
    return this.monthlyData.length > 0 ? Math.min(...this.monthlyData.map(d => d.daily_total_stats.total_protein_g)) : 0;
  }

  getMaxProtein(): number {
    return this.monthlyData.length > 0 ? Math.max(...this.monthlyData.map(d => d.daily_total_stats.total_protein_g)) : 0;
  }

  getTotalProtein(): number {
    return this.monthlyData.reduce((sum, data) => sum + data.daily_total_stats.total_protein_g, 0);
  }

  getBurnedStatus(): string {
    const avgBurned = this.getAvgBurned();
    if (avgBurned >= 500) return 'Excellent burn rate';
    if (avgBurned >= 300) return 'Good activity level';
    if (avgBurned >= 150) return 'Moderate activity';
    return 'Low activity level';
  }

  getAvgBurned(): number {
    const burnedValues = this.monthlyData.map(d => d.exercise_summary?.total_burned_calories || 0).filter(val => val > 0);
    return burnedValues.length > 0 ? Math.round(burnedValues.reduce((sum, val) => sum + val, 0) / burnedValues.length) : 0;
  }

  getMaxBurned(): number {
    return this.monthlyData.length > 0 ? Math.max(...this.monthlyData.map(d => d.exercise_summary?.total_burned_calories || 0)) : 0;
  }

  getMinBurned(): number {
    const burnedValues = this.monthlyData.map(d => d.exercise_summary?.total_burned_calories || 0).filter(val => val > 0);
    return burnedValues.length > 0 ? Math.min(...burnedValues) : 0;
  }

  convertToCompactFormat(): string {
    return this.monthlyData.map(d => {
      const foods = d.food_diary.map(f => `${f.item}:${f.calories}c/${f.protein_g}p/${f.carbs_g}cb/${f.fat_g}f`).join(';');
      const exercises = Object.keys(d.exercise_summary).filter(k => k !== 'total_burned_calories').map(k => {
        const ex = d.exercise_summary[k as keyof typeof d.exercise_summary] as any;
        if (k.includes('cardio')) {
          return `${ex.type}:${ex.duration_min}min/${ex.distance_mi}mi/${ex.calories_burned}cal`;
        }
        return `${ex.type}:${ex.duration_min}min/${ex.calories_burned}cal`;
      }).join(';');
      return `D:${d.date}|W:${d.user_profile.weight_kg}kg|G:${d.user_profile.goal_calories}|T:${d.daily_total_stats.total_intake_calories}/${d.daily_total_stats.total_protein_g}p/${d.daily_total_stats.total_carbs_g}c/${d.daily_total_stats.total_fat_g}f|B:${d.daily_total_stats.total_burned_calories}|N:${d.daily_total_stats.net_calories}|F:[${foods}]|E:[${exercises}]|A:${d.ai_evaluation.recommendation}`;
    }).join('\n');
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.monthlyData.length > 0) {
        this.createChart();
      }
    }, 500);
  }

  createChart() {
    if (!this.calorieChart?.nativeElement || this.monthlyData.length === 0 || this.chartInitialized) return;
    
    if (this.chart) {
      this.chart.destroy();
    }
    
    this.chartInitialized = true;
    
    const ctx = this.calorieChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.chart = new Chart(ctx, {
      type: 'line' as const,
      data: {
        labels: this.monthlyData.map(d => new Date(d.date).getDate()),
        datasets: [{
          label: 'Intake Calories',
          data: this.monthlyData.map(d => d.daily_total_stats.total_intake_calories || 0),
          borderColor: 'rgba(156, 39, 176, 0.4)',
          backgroundColor: 'rgba(156, 39, 176, 0.2)',
          tension: 0.4,
          pointRadius: 1,
          borderDash: [5, 10]
        }, {
          label: 'Burn Calories',
          data: this.monthlyData.map(d => d.exercise_summary?.total_burned_calories || 0),
          borderColor: 'rgba(255, 87, 34, 0.4)',
          backgroundColor: 'rgba(255, 87, 34, 0.2)',
          tension: 0.4,
          pointRadius: 1,
          borderDash: [5, 10]
        }, {
          label: 'Net Calories',
          data: this.monthlyData.map(d => d.daily_total_stats.net_calories || 0),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          pointBackgroundColor: this.monthlyData.map(d => {
            const status = this.getStatusClass(d);
            return status === 'deficit' ? '#f44336' : status === 'surplus' ? '#ff9800' : '#4CAF50';
          }),
          pointRadius: 1,
          tension: 0.4
        }, {
          label: 'Recommended Intake',
          data: this.monthlyData.map(d => d.user_profile.goal_calories || d.user_profile.recommended_daily_calories || 0),
          borderColor: '#2196F3',
          backgroundColor: 'transparent',
          borderDash: [5, 20],
          pointRadius: 0,
          tension: 0
        }, {
          label: 'TDEE',
          data: this.monthlyData.map(d => d.user_profile.recommended_daily_calories || 2100),
          borderColor: '#FF9800',
          backgroundColor: 'transparent',
          borderDash: [10, 5],
          pointRadius: 0,
          tension: 0,
          // hidden: true
        }, {
          label: 'Min Intake (Weight Loss)',
          data: this.monthlyData.map(d => d.user_profile.min_weight_loss_calories || 1200),
          borderColor: 'rgba(244, 67, 54, 0.7)',
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0,
          // hidden: true
        }, {
          label: 'Max Intake (Weight Loss)',
          data: this.monthlyData.map(d => d.user_profile.max_weight_loss_calories || 1800),
          borderColor: 'rgba(233, 30, 99, 0.7)',
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0,
          // hidden: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: window.innerWidth < 768 ? 8 : 15
            }
          },
          y: {
            beginAtZero: false,
            ticks: {
              stepSize: window.innerWidth < 768 ? 200 : 100,
              maxTicksLimit: window.innerWidth < 768 ? 6 : 10
            },
            title: {
              display: true,
              text: 'Calories'
            }
          }
        }
      }
    });
  }

  copyRawApiResponse() {
    const compactText = this.convertToCompactFormat();
    navigator.clipboard.writeText(compactText).then(() => {
      this.dialog.open(MessageDialogComponent, {
        data: { message: 'Compact data copied to clipboard!', type: 'success' },
        width: '400px'
      });
    }).catch(() => {
      this.dialog.open(MessageDialogComponent, {
        data: { message: 'Failed to copy data', type: 'error' },
        width: '400px'
      });
    });
  }
}