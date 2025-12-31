import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from './services/database.service';
import { FitnessData } from './models/fitness.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {
  currentData: FitnessData | null = null;
  today = new Date();
  selectedDate = new Date();
  selectedDateString = '';
  showAddFood = false;
  showAddExercise = false;
  showDetails = false;
  showJson = false;
  
  newFood = { item: '', calories: 0, protein_g: 0, carbs_g: 0 };
  newExercise = { type: 'cardio', duration: 0, calories: 0 };

  constructor(private databaseService: DatabaseService) {}

  ngOnInit() {
    this.selectedDateString = this.formatDateForInput(this.selectedDate);
    this.loadDataForDate();
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  changeDate(days: number) {
    this.selectedDate.setDate(this.selectedDate.getDate() + days);
    this.selectedDateString = this.formatDateForInput(this.selectedDate);
    this.loadDataForDate();
  }

  onDateChange() {
    this.selectedDate = new Date(this.selectedDateString);
    this.loadDataForDate();
  }

  loadDataForDate() {
    const dateStr = this.formatDateForInput(this.selectedDate);
    
    this.databaseService.getFitnessDataByDate(dateStr).subscribe({
      next: (data) => {
        this.currentData = data;
        console.log(data);
      },
      error: (err) => {
        console.log('No data found for date:', dateStr);
        this.currentData = null;
      }
    });
  }


  getCalorieProgress(): number {
    if (!this.currentData) return 0;
    return parseFloat(Math.min((this.currentData.daily_summary.total_intake_calories / this.currentData.user_profile.goal_calories) * 100, 100).toFixed(2));
  }

  getProteinProgress(): number {
    if (!this.currentData) return 0;
    return parseFloat(Math.min((this.currentData.daily_summary.total_protein_g / this.currentData.user_profile.maintenance_protein_target_g) * 100, 100).toFixed(2));
  }

  getStatusClass(): string {
    if (!this.currentData) return '';
    const netCal = this.currentData.daily_summary.net_calories;
    if (netCal < 0) return 'deficit';
    if (netCal > 200) return 'surplus';
    return 'maintenance';
  }

  getStatusEmoji(): string {
    const statusClass = this.getStatusClass();
    if (statusClass === 'deficit') return '📉';
    if (statusClass === 'surplus') return '📈';
    return '⚖️';
  }

  getStatusText(): string {
    const statusClass = this.getStatusClass();
    if (statusClass === 'deficit') return 'Deficit';
    if (statusClass === 'surplus') return 'Surplus';
    return 'Maintenance';
  }

  getBMI(): string {
    if (!this.currentData) return '0.00';
    const heightM = this.currentData.user_profile.height_cm / 100;
    const bmi = this.currentData.user_profile.weight_kg / (heightM * heightM);
    return bmi.toFixed(2);
  }

  getBMICategory(): string {
    const bmi = parseFloat(this.getBMI());
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  getWaterIntake(): string {
    // Estimate water intake based on body weight (35ml per kg)
    if (!this.currentData) return '0.00';
    const recommended = (this.currentData.user_profile.weight_kg * 35) / 1000;
    return recommended.toFixed(2);
  }

  getWaterProgress(): number {
    // Simulate current water intake (80% of recommended)
    return 80.00;
  }

  getStreak(): number {
    // Simulate workout streak
    return 7;
  }

  getFormattedJson(): string {
    return JSON.stringify(this.currentData, null, 2);
  }

  copyJson() {
    const jsonText = this.getFormattedJson();
    navigator.clipboard.writeText(jsonText).then(() => {
      alert('JSON copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy JSON');
    });
  }

  exportData() {
    const jsonText = this.getFormattedJson();
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-data-${this.selectedDateString}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const data = JSON.parse(e.target.result);
            this.databaseService.createFitnessData(data).subscribe({
              next: (savedData) => {
                this.currentData = savedData;
                alert('Data imported successfully!');
              },
              error: (err) => {
                console.error('Error importing data:', err);
                alert('Error importing data');
              }
            });
          } catch (error) {
            alert('Invalid JSON file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.onchange = (event: any) => {
      const files = Array.from(event.target.files);
      let imported = 0;
      let total = files.length;
      
      files.forEach((file: any) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const data = JSON.parse(e.target.result);
            this.databaseService.createFitnessData(data).subscribe({
              next: () => {
                imported++;
                if (imported === total) {
                  alert(`Successfully imported ${imported} files!`);
                  this.loadDataForDate();
                }
              },
              error: (err) => {
                console.error('Error importing file:', err);
                imported++;
                if (imported === total) {
                  alert(`Import completed. Some files may have failed.`);
                  this.loadDataForDate();
                }
              }
            });
          } catch (error) {
            imported++;
            if (imported === total) {
              alert(`Import completed. Some files were invalid.`);
              this.loadDataForDate();
            }
          }
        };
        reader.readAsText(file);
      });
    };
    input.click();
  }

  addFood() {
    if (this.newFood.item && this.newFood.calories > 0 && this.currentData) {
      this.currentData.food_diary.push({...this.newFood});
      this.updateSummary();
      
      // Save updated data to database
      this.databaseService.createFitnessData(this.currentData).subscribe({
        next: (data) => {
          this.currentData = data;
        },
        error: (err) => {
          console.error('Error updating data:', err);
        }
      });
      
      this.newFood = { item: '', calories: 0, protein_g: 0, carbs_g: 0 };
      this.showAddFood = false;
    }
  }

  removeFood(index: number) {
    if (this.currentData) {
      this.currentData.food_diary.splice(index, 1);
      this.updateSummary();
      
      // Save updated data to database
      this.databaseService.createFitnessData(this.currentData).subscribe({
        next: (data) => {
          this.currentData = data;
        },
        error: (err) => {
          console.error('Error updating data:', err);
        }
      });
    }
  }

  addExercise() {
    // Exercise adding logic would go here
    this.showAddExercise = false;
  }

  updateSummary() {
    if (!this.currentData) return;
    
    const totalCalories = this.currentData.food_diary.reduce((sum, food) => sum + food.calories, 0);
    const totalProtein = this.currentData.food_diary.reduce((sum, food) => sum + food.protein_g, 0);
    const totalCarbs = this.currentData.food_diary.reduce((sum, food) => sum + food.carbs_g, 0);
    
    this.currentData.daily_summary.total_intake_calories = totalCalories;
    this.currentData.daily_summary.total_protein_g = totalProtein;
    this.currentData.daily_summary.total_carbs_g = totalCarbs;
    this.currentData.daily_summary.net_calories = totalCalories - this.currentData.exercise.total_burned_calories;
  }

  createEmptyData() {
    const dateStr = this.formatDateForInput(this.selectedDate);
    const emptyData: FitnessData = {
      date: dateStr,
      user_profile: {
        weight_kg: 70,
        height_cm: 170,
        goal_calories: 2000,
        maintenance_protein_target_g: 100
      },
      food_diary: [],
      exercise: {
        cardio: {
          type: "No Exercise",
          distance_mi: 0,
          duration_min: 0,
          calories_burned: 0
        },
        strength_training: {
          target_area: "None",
          duration_min: 0,
          calories_burned: 0,
          intensity: "None"
        },
        total_burned_calories: 0
      },
      daily_summary: {
        total_intake_calories: 0,
        total_burned_calories: 0,
        net_calories: 0,
        total_protein_g: 0,
        total_carbs_g: 0,
        status: "No Data - Start Tracking!"
      }
    };

    this.databaseService.createFitnessData(emptyData).subscribe({
      next: (data) => {
        this.currentData = data;
      },
      error: (err) => {
        console.error('Error creating data:', err);
      }
    });
  }


}