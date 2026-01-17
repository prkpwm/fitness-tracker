import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../services/data.service';
import { FitnessData } from '../models/fitness.model';
import { MessageDialogComponent } from '../components/message-dialog.component';

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
export class MonthDashboardComponent implements OnInit {
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

  constructor(private dataService: DataService, private router: Router, private route: ActivatedRoute, private dialog: MatDialog) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['year'] && params['month'] !== undefined) {
        this.currentMonth = new Date(parseInt(params['year']), parseInt(params['month']), 1);
      }
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
        this.loading = false;
      },
      error: () => {
        this.monthlyData = [];
        this.calculateStats();
        this.generateCalendar();
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