import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../services/data.service';
import { FitnessData } from '../models/fitness.model';

interface YearlyStats {
  totalActiveDays: number;
  avgCalories: number;
  avgProtein: number;
  totalBurned: number;
  bestMonth: string;
  completionRate: number;
}

interface MonthData {
  month: number;
  name: string;
  activeDays: number;
  totalDays: number;
  avgCalories: number;
  completionRate: number;
  status: string;
}

@Component({
  selector: 'app-year-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './year-dashboard.html',
  styleUrls: ['./year-dashboard.css']
})
export class YearDashboardComponent implements OnInit {
  currentYear = new Date().getFullYear();
  loading = false;
  yearlyStats: YearlyStats = {
    totalActiveDays: 0,
    avgCalories: 0,
    avgProtein: 0,
    totalBurned: 0,
    bestMonth: '',
    completionRate: 0
  };
  monthsData: MonthData[] = [];

  constructor(private dataService: DataService, private router: Router) {}

  ngOnInit() {
    this.loadYearlyData();
  }

  loadYearlyData() {
    this.loading = true;
    this.monthsData = [];
    
    this.dataService.getAllFitnessData().subscribe({
      next: (allData) => {
        // Filter data for current year
        const yearData = allData.filter(data => {
          const dataDate = new Date(data.date);
          return dataDate.getFullYear() === this.currentYear;
        });
        
        // Process data by months
        for (let month = 0; month < 12; month++) {
          const monthData = yearData.filter(data => {
            const dataDate = new Date(data.date);
            return dataDate.getMonth() === month;
          });
          
          const daysInMonth = new Date(this.currentYear, month + 1, 0).getDate();
          this.processMonthData(month, monthData, daysInMonth);
        }
        
        this.calculateYearlyStats(yearData);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  processMonthData(month: number, data: FitnessData[], totalDays: number) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const avgCalories = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.daily_total_stats.total_intake_calories, 0) / data.length) : 0;
    const completionRate = Math.round((data.length / totalDays) * 100);
    
    let status = 'low';
    if (completionRate >= 80) status = 'excellent';
    else if (completionRate >= 60) status = 'good';
    else if (completionRate >= 40) status = 'fair';

    this.monthsData[month] = {
      month: month,
      name: monthNames[month],
      activeDays: data.length,
      totalDays: totalDays,
      avgCalories: avgCalories,
      completionRate: completionRate,
      status: status
    };
  }

  calculateYearlyStats(allData: FitnessData[]) {
    if (allData.length === 0) {
      this.loading = false;
      return;
    }

    this.yearlyStats.totalActiveDays = allData.length;
    this.yearlyStats.avgCalories = Math.round(allData.reduce((sum, d) => sum + d.daily_total_stats.total_intake_calories, 0) / allData.length);
    this.yearlyStats.avgProtein = Math.round(allData.reduce((sum, d) => sum + d.daily_total_stats.total_protein_g, 0) / allData.length);
    this.yearlyStats.totalBurned = allData.reduce((sum, d) => sum + d.exercise_summary?.total_burned_calories || 0, 0);
    
    const totalDaysInYear = new Date(this.currentYear, 11, 31).getDate() === 31 ? 365 : 366;
    this.yearlyStats.completionRate = Math.round((this.yearlyStats.totalActiveDays / totalDaysInYear) * 100);

    // Find best month
    const bestMonth = this.monthsData.reduce((best, current) => 
      current.completionRate > best.completionRate ? current : best
    );
    this.yearlyStats.bestMonth = bestMonth.name;
    this.loading = false;
  }

  changeYear(direction: number) {
    this.currentYear += direction;
    this.loadYearlyData();
  }

  onMonthClick(month: number) {
    const date = new Date(this.currentYear, month, 1);
    this.router.navigate(['/monthly'], { queryParams: { year: this.currentYear, month: month } });
  }
}