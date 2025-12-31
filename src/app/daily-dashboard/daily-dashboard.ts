import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { FitnessData } from '../models/fitness.model';

@Component({
  selector: 'app-daily-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './daily-dashboard.html',
  styleUrls: ['./daily-dashboard.css']
})
export class DailyDashboardComponent implements OnInit {
  currentData: FitnessData | null = null;
  today = new Date();
  selectedDate = new Date();
  selectedDateString = '';
  showAddFood = false;
  showAddExercise = false;
  showDetails = false;
  showJson = false;
  showJsonImport = false;
  jsonTextArea = '';
  editingWeight = false;
  tempWeight = 0;

  newFood = { item: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  newExercise = { type: 'cardio', duration: 0, calories: 0 };

  constructor(private databaseService: DatabaseService, private route: ActivatedRoute) { }

  ngOnInit() {
    // Check for date query parameter
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.selectedDate = new Date(params['date']);
      }
      this.selectedDateString = this.formatDateForInput(this.selectedDate);
      this.loadDataForDate();
    });
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
    if (!this.currentData?.daily_total_stats) return 0;
    return parseFloat(Math.min((this.currentData.daily_total_stats.total_intake_calories / this.currentData.user_profile.goal_calories) * 100, 100).toFixed(2));
  }

  getProteinProgress(): number {
    if (!this.currentData?.daily_total_stats) return 0;
    return parseFloat(Math.min((this.currentData.daily_total_stats.total_protein_g / this.currentData.user_profile.maintenance_protein_target_g) * 100, 100).toFixed(2));
  }

  getStatusClass(): string {
    if (!this.currentData?.daily_total_stats) return '';
    const netCal = this.currentData.daily_total_stats.net_calories;
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
    if (!this.currentData) return '0.00';
    const recommended = (this.currentData.user_profile.weight_kg * 35) / 1000;
    return recommended.toFixed(2);
  }

  getWaterProgress(): number {
    return 80.00;
  }

  getStreak(): number {
    return 7;
  }

  getCarbsRecommendation(): string {
    if (!this.currentData) return '';
    const weight = this.currentData.user_profile.weight_kg;
    const recommended = Math.round(weight * 2);
    return `${recommended}g recommended`;
  }

  getFatRecommendation(): string {
    if (!this.currentData) return '';
    const weight = this.currentData.user_profile.weight_kg;
    const recommended = Math.round(weight * 0.8);
    return `${recommended}g recommended`;
  }

  getCarbsStatus(): string {
    if (!this.currentData?.daily_total_stats) return '';

    const totalCals = this.currentData.daily_total_stats.total_intake_calories;
    if (totalCals === 0) return 'normal-intake';

    const carbsGrams = this.currentData.daily_total_stats.total_carbs_g;
    // Research: Carbs should be 45-65% of total calories. 1g Carb = 4 kcal.
    const carbsCalories = carbsGrams * 4;
    const carbsPercentage = (carbsCalories / totalCals) * 100;

    if (carbsPercentage < 45) return 'low-intake';
    if (carbsPercentage > 65) return 'high-intake';
    return 'normal-intake';
  }

  getFatStatus(): string {
    if (!this.currentData?.daily_total_stats) return '';

    const totalCals = this.currentData.daily_total_stats.total_intake_calories;
    if (totalCals === 0) return 'normal-intake';

    const fatGrams = this.currentData.daily_total_stats.total_fat_g;
    // Research: Fats should be 20-35% of total calories. 1g Fat = 9 kcal.
    const fatCalories = fatGrams * 9;
    const fatPercentage = (fatCalories / totalCals) * 100;

    if (fatPercentage < 20) return 'low-intake';
    if (fatPercentage > 35) return 'high-intake';
    return 'normal-intake';
  }

  getCarbsDescription(): string {
    if (!this.currentData?.daily_total_stats) return '';
    const status = this.getCarbsStatus();
    if (status === 'low-intake') return 'Too low - increase carbs';
    if (status === 'high-intake') return 'Too high - reduce carbs';
    return 'Optimal range (45-65)';
  }

  getFatDescription(): string {
    if (!this.currentData?.daily_total_stats) return '';
    const status = this.getFatStatus();
    if (status === 'low-intake') return 'Too low - increase fats';
    if (status === 'high-intake') return 'Too high - reduce fats';
    return 'Optimal range (20-35)';
  }

  getCarbsPercentage(): string {
    if (!this.currentData?.daily_total_stats) return '0%';
    const totalCals = this.currentData.daily_total_stats.total_intake_calories;
    if (totalCals === 0) return '0%';
    const carbsGrams = this.currentData.daily_total_stats.total_carbs_g;
    const carbsCalories = carbsGrams * 4;
    const percentage = (carbsCalories / totalCals) * 100;
    return `${percentage.toFixed(1)}%`;
  }

  getFatPercentage(): string {
    if (!this.currentData?.daily_total_stats) return '0%';
    const totalCals = this.currentData.daily_total_stats.total_intake_calories;
    if (totalCals === 0) return '0%';
    const fatGrams = this.currentData.daily_total_stats.total_fat_g;
    const fatCalories = fatGrams * 9;
    const percentage = (fatCalories / totalCals) * 100;
    return `${percentage.toFixed(1)}%`;
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

  startEditWeight() {
    this.editingWeight = true;
    this.tempWeight = this.currentData?.user_profile.weight_kg || 0;
  }

  saveWeight() {
    if (this.currentData && this.tempWeight > 0) {
      this.currentData.user_profile.weight_kg = this.tempWeight;
      this.updateSummary();
      this.databaseService.createFitnessData(this.currentData).subscribe({
        next: (data) => {
          this.currentData = data;
          this.editingWeight = false;
        },
        error: (err) => {
          console.error('Error updating weight:', err);
        }
      });
    }
  }

  cancelEditWeight() {
    this.editingWeight = false;
    this.tempWeight = 0;
  }

  importJsonFromText() {
    if (!this.jsonTextArea.trim()) {
      alert('Please enter JSON data');
      return;
    }

    try {
      const data = JSON.parse(this.jsonTextArea);
      this.databaseService.createFitnessData(data).subscribe({
        next: (savedData) => {
          this.currentData = savedData;
          this.jsonTextArea = '';
          this.showJsonImport = false;
          alert('JSON data imported successfully!');
        },
        error: (err) => {
          console.error('Error importing JSON:', err);
          alert('Error importing JSON data');
        }
      });
    } catch (error) {
      alert('Invalid JSON format');
    }
  }

  addFood() {
    if (this.newFood.item && this.newFood.calories > 0 && this.currentData) {
      this.currentData.food_diary.push({ ...this.newFood });
      this.updateSummary();

      this.databaseService.createFitnessData(this.currentData).subscribe({
        next: (data) => {
          this.currentData = data;
        },
        error: (err) => {
          console.error('Error updating data:', err);
        }
      });

      this.newFood = { item: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      this.showAddFood = false;
    }
  }

  removeFood(index: number) {
    if (this.currentData) {
      this.currentData.food_diary.splice(index, 1);
      this.updateSummary();

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
    this.showAddExercise = false;
  }

  updateSummary() {
    if (!this.currentData?.daily_total_stats || !this.currentData?.exercise_summary) return;

    const totalCalories = this.currentData.food_diary.reduce((sum, food) => sum + food.calories, 0);
    const totalProtein = this.currentData.food_diary.reduce((sum, food) => sum + food.protein_g, 0);
    const totalCarbs = this.currentData.food_diary.reduce((sum, food) => sum + food.carbs_g, 0);
    const totalFat = this.currentData.food_diary.reduce((sum, food) => sum + food.fat_g, 0);

    this.currentData.daily_total_stats.total_intake_calories = totalCalories;
    this.currentData.daily_total_stats.total_protein_g = totalProtein;
    this.currentData.daily_total_stats.total_carbs_g = totalCarbs;
    this.currentData.daily_total_stats.total_fat_g = totalFat;
    this.currentData.daily_total_stats.net_calories = totalCalories - this.currentData.exercise_summary.total_burned_calories;
    this.currentData.daily_total_stats.protein_per_kg = totalProtein / this.currentData.user_profile.weight_kg;
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
      exercise_summary: {
        total_burned_calories: 0
      },
      daily_total_stats: {
        total_intake_calories: 0,
        total_burned_calories: 0,
        net_calories: 0,
        total_protein_g: 0,
        total_carbs_g: 0,
        total_fat_g: 0,
        protein_per_kg: 0
      },
      ai_evaluation: {
        muscle_maintenance: "No Data",
        weight_loss_status: "No Data",
        recommendation: "Start tracking to get recommendations!"
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