import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';
import { FitnessData } from '../models/fitness.model';

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

  constructor(private databaseService: DatabaseService) {}

  ngOnInit() {
    this.loadMonthlyData();
  }

  loadMonthlyData() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    this.monthlyData = [];
    let loadedDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      this.databaseService.getFitnessDataByDate(dateStr).subscribe({
        next: (data) => {
          this.monthlyData.push(data);
          loadedDays++;
          if (loadedDays === daysInMonth) {
            this.calculateStats();
            this.generateCalendar();
          }
        },
        error: () => {
          loadedDays++;
          if (loadedDays === daysInMonth) {
            this.calculateStats();
            this.generateCalendar();
          }
        }
      });
    }
  }

  calculateStats() {
    if (this.monthlyData.length === 0) return;

    this.monthlyStats.activeDays = this.monthlyData.length;
    this.monthlyStats.totalDays = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0).getDate();
    
    const totalCalories = this.monthlyData.reduce((sum, data) => sum + data.daily_summary.total_intake_calories, 0);
    const totalProtein = this.monthlyData.reduce((sum, data) => sum + data.daily_summary.total_protein_g, 0);
    this.monthlyStats.totalBurned = this.monthlyData.reduce((sum, data) => sum + data.exercise.total_burned_calories, 0);
    
    this.monthlyStats.avgCalories = Math.round(totalCalories / this.monthlyStats.activeDays);
    this.monthlyStats.avgProtein = Math.round(totalProtein / this.monthlyStats.activeDays);

    // Find best and worst days
    let bestData = this.monthlyData[0];
    let worstData = this.monthlyData[0];
    
    this.monthlyData.forEach(data => {
      if (data.daily_summary.total_intake_calories > bestData.daily_summary.total_intake_calories) {
        bestData = data;
      }
      if (data.daily_summary.total_intake_calories < worstData.daily_summary.total_intake_calories) {
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
      const dateStr = new Date(year, month, day).toISOString().split('T')[0];
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
    const netCal = data.daily_summary.net_calories;
    if (netCal < 0) return 'deficit';
    if (netCal > 200) return 'surplus';
    return 'maintenance';
  }

  changeMonth(direction: number) {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
    this.loadMonthlyData();
  }

  getMonthName(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  getCompletionRate(): number {
    return Math.round((this.monthlyStats.activeDays / this.monthlyStats.totalDays) * 100);
  }
}