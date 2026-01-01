import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { DatabaseService } from './database.service';
import { FitnessData } from '../models/fitness.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor(
    private apiService: ApiService,
    private databaseService: DatabaseService
  ) {}

  getFitnessDataByDate(date: string): Observable<FitnessData> {
    return this.apiService.getFitnessDataByDate(date).pipe(
      tap(data => {
        // Cache to local database on API success
        this.databaseService.createFitnessData(data).subscribe();
      }),
      catchError((error) => {
        // If 404 or any error, fallback to local database
        if (error.status === 404 || error.status) {
          return this.databaseService.getFitnessDataByDate(date).pipe(
            tap(data => {
              // Retry API call in background only if there's actual calorie data
              if (data.daily_total_stats.total_intake_calories != 0) {
                this.apiService.createFitnessData(data).subscribe();
              }
            })
          );
        }
        // For other errors, still fallback to database
        return this.databaseService.getFitnessDataByDate(date).pipe(
          tap(data => {
            // Retry API call in background only if there's actual calorie data
            if (data.daily_total_stats.total_intake_calories != 0) {
              this.apiService.createFitnessData(data).subscribe();
            }
          })
        );
      })
    );
  }

  createFitnessData(data: FitnessData): Observable<FitnessData> {
    // Only call API if there's actual calorie data
    if (data.daily_total_stats.total_intake_calories != 0) {
      return this.apiService.createFitnessData(data).pipe(
        tap(result => {
          // Cache to local database on API success
          this.databaseService.createFitnessData(result).subscribe();
        }),
        catchError(() => {
          // Fallback to local database only
          return this.databaseService.createFitnessData(data);
        })
      );
    } else {
      // For zero calorie data, only use local database
      return this.databaseService.createFitnessData(data);
    }
  }

  getAllFitnessData(): Observable<FitnessData[]> {
    return this.apiService.getAllFitnessData().pipe(
      tap(data => {
        // Cache all data to local database
        data.forEach(item => {
          this.databaseService.createFitnessData(item).subscribe();
        });
      }),
      catchError((error) => {
        // If 404 or any error, fallback to local database
        if (error.status === 404 || error.status) {
          return this.databaseService.getAllData();
        }
        // For other errors, still fallback to database
        return this.databaseService.getAllData();
      })
    );
  }
}