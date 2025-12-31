import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
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
  yearlyStats: YearlyStats = {
    totalActiveDays: 0,
    avgCalories: 0,
    avgProtein: 0,
    totalBurned: 0,
    bestMonth: '',
    completionRate: 0
  };
  monthsData: MonthData[] = [];

  constructor(private databaseService: DatabaseService, private router: Router) {}

  ngOnInit() {
    this.loadYearlyData();
  }

  loadYearlyData() {
    this.monthsData = [];
    let loadedMonths = 0;
    const allData: FitnessData[] = [];

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(this.currentYear, month + 1, 0).getDate();
      let monthData: FitnessData[] = [];
      let loadedDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${this.currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        this.databaseService.getFitnessDataByDate(dateStr).subscribe({
          next: (data) => {
            monthData.push(data);
            allData.push(data);
            loadedDays++;
            if (loadedDays === daysInMonth) {
              this.processMonthData(month, monthData, daysInMonth);
              loadedMonths++;
              if (loadedMonths === 12) {
                this.calculateYearlyStats(allData);
              }
            }
          },
          error: () => {
            loadedDays++;
            if (loadedDays === daysInMonth) {
              this.processMonthData(month, monthData, daysInMonth);
              loadedMonths++;
              if (loadedMonths === 12) {
                this.calculateYearlyStats(allData);
              }
            }
          }
        });
      }
    }
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
    if (allData.length === 0) return;

    this.yearlyStats.totalActiveDays = allData.length;
    this.yearlyStats.avgCalories = Math.round(allData.reduce((sum, d) => sum + d.daily_total_stats.total_intake_calories, 0) / allData.length);
    this.yearlyStats.avgProtein = Math.round(allData.reduce((sum, d) => sum + d.daily_total_stats.total_protein_g, 0) / allData.length);
    this.yearlyStats.totalBurned = allData.reduce((sum, d) => sum + d.exercise_summary.total_burned_calories, 0);
    
    const totalDaysInYear = new Date(this.currentYear, 11, 31).getDate() === 31 ? 365 : 366;
    this.yearlyStats.completionRate = Math.round((this.yearlyStats.totalActiveDays / totalDaysInYear) * 100);

    // Find best month
    const bestMonth = this.monthsData.reduce((best, current) => 
      current.completionRate > best.completionRate ? current : best
    );
    this.yearlyStats.bestMonth = bestMonth.name;
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