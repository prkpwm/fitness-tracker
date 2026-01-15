import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from '../services/data.service';
import { FitnessData } from '../models/fitness.model';
import { MessageDialogComponent } from '../components/message-dialog.component';

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
  allYearData: FitnessData[] = [];

  constructor(private dataService: DataService, private router: Router, private dialog: MatDialog) {}

  ngOnInit() {
    this.loadYearlyData();
  }

  loadYearlyData() {
    this.loading = true;
    this.monthsData = [];
    
    this.dataService.getFitnessDataByYear(this.currentYear).subscribe({
      next: (allData) => {
        // Data is already filtered for current year
        const yearData = allData;
        
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

    // Store all data for min/max calculations
    this.allYearData = allData;

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
    this.router.navigate(['/monthly'], { queryParams: { year: this.currentYear, month: month } });
  }

  getRecommendedCalories(): number {
    // Use first available data point for user profile
    const allData = this.monthsData.flatMap(m => m);
    return 2000; // Default fallback - could be enhanced to get from user profile
  }

  getAvgNetCalories(): number {
    const totalActiveDays = this.yearlyStats.totalActiveDays;
    if (totalActiveDays === 0) return 0;
    // This would need actual net calorie data - simplified for now
    return this.yearlyStats.avgCalories - 300; // Rough estimate
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
    if (diff < -200) return 'Excellent yearly deficit trend';
    if (diff < 0) return 'Good yearly deficit maintained';
    if (diff <= 200) return 'Near maintenance for the year';
    return 'High yearly surplus - review goals';
  }

  getTotalCalories(): number {
    return this.yearlyStats.avgCalories * this.yearlyStats.totalActiveDays;
  }

  getEstimatedWeightDecrease(): number {
    const totalDeficit = Math.abs(this.getCalorieDifference()) * this.yearlyStats.totalActiveDays;
    return totalDeficit > 0 ? Math.round((totalDeficit / 7700) * 10) / 10 : 0; // 7700 cal = 1kg
  }

  getActivityScore(): number {
    return Math.round((this.yearlyStats.completionRate + (this.yearlyStats.totalBurned / 100)) / 2);
  }

  getActivityStatus(): string {
    const score = this.getActivityScore();
    if (score >= 80) return 'Excellent activity level';
    if (score >= 60) return 'Good activity level';
    if (score >= 40) return 'Moderate activity level';
    return 'Low activity level';
  }

  getTotalProtein(): number {
    return this.yearlyStats.avgProtein * this.yearlyStats.totalActiveDays;
  }

  getMinCalories(): number {
    return this.allYearData.length > 0 ? Math.min(...this.allYearData.map(d => d.daily_total_stats.total_intake_calories)) : 0;
  }

  getMaxCalories(): number {
    return this.allYearData.length > 0 ? Math.max(...this.allYearData.map(d => d.daily_total_stats.total_intake_calories)) : 0;
  }

  getMinProtein(): number {
    return this.allYearData.length > 0 ? Math.min(...this.allYearData.map(d => d.daily_total_stats.total_protein_g)) : 0;
  }

  getMaxProtein(): number {
    return this.allYearData.length > 0 ? Math.max(...this.allYearData.map(d => d.daily_total_stats.total_protein_g)) : 0;
  }

  copyRawApiResponse() {
    const jsonText = JSON.stringify(this.allYearData, null, 2);
    navigator.clipboard.writeText(jsonText).then(() => {
      this.dialog.open(MessageDialogComponent, {
        data: { message: 'Raw API response copied to clipboard!', type: 'success' },
        width: '400px'
      });
    }).catch(() => {
      this.dialog.open(MessageDialogComponent, {
        data: { message: 'Failed to copy API response', type: 'error' },
        width: '400px'
      });
    });
  }
}