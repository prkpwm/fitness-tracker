import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DataService } from '../services/data.service';
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

  constructor(private dataService: DataService, private router: Router, private route: ActivatedRoute) {}

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
    this.dataService.getAllFitnessData().subscribe({
      next: (allData) => {
        // Filter data for current month
        this.monthlyData = allData.filter(data => {
          const dataDate = new Date(data.date);
          return dataDate.getFullYear() === year && dataDate.getMonth() === month;
        });
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
}