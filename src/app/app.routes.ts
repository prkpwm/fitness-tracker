import { Routes } from '@angular/router';
import { AppComponent } from './app';
import { MonthDashboardComponent } from './month-dashboard/month-dashboard';
import { LayoutComponent } from './layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: '/daily', pathMatch: 'full' },
      { path: 'daily', component: AppComponent },
      { path: 'monthly', component: MonthDashboardComponent }
    ]
  }
];
