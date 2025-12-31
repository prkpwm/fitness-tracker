import { Routes } from '@angular/router';
import { DailyDashboardComponent } from './daily-dashboard/daily-dashboard';
import { MonthDashboardComponent } from './month-dashboard/month-dashboard';
import { YearDashboardComponent } from './year-dashboard/year-dashboard';
import { JsonInterfaceComponent } from './json-interface/json-interface';

export const routes: Routes = [
  { path: '', redirectTo: '/daily', pathMatch: 'full' },
  { path: 'daily', component: DailyDashboardComponent },
  { path: 'monthly', component: MonthDashboardComponent },
  { path: 'yearly', component: YearDashboardComponent },
  { path: 'get', component: JsonInterfaceComponent }
];