import { Routes } from '@angular/router';
import { DailyDashboardComponent } from './daily-dashboard/daily-dashboard';
import { MonthDashboardComponent } from './month-dashboard/month-dashboard';

export const routes: Routes = [
  { path: '', redirectTo: '/daily', pathMatch: 'full' },
  { path: 'daily', component: DailyDashboardComponent },
  { path: 'monthly', component: MonthDashboardComponent }
];
