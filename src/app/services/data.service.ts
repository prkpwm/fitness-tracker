import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap, switchMap, map, timeout } from 'rxjs/operators';
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
    return this.databaseService.getFitnessDataByDate(date).pipe(
      switchMap(dbData => {
        // Start API call in parallel
        this.apiService.getFitnessDataByDate(date).pipe(
          timeout(60000),
          tap(apiData => {
            // Update database with API data when it arrives
            this.databaseService.createFitnessData(apiData).subscribe();
          }),
          catchError(() => {
            // If API fails, try to sync local data to API
            if (dbData.daily_total_stats.total_intake_calories != 0) {
              this.apiService.createFitnessData(dbData).subscribe();
            }
            return of(null);
          })
        ).subscribe();
        
        // Return database data immediately
        return of(dbData);
      }),
      catchError(() => {
        // If database fails, try API
        return this.apiService.getFitnessDataByDate(date).pipe(
          timeout(60000),
          tap(apiData => {
            this.databaseService.createFitnessData(apiData).subscribe();
          })
        );
      })
    );
  }

  createFitnessData(data: FitnessData): Observable<FitnessData> {
    if (data.daily_total_stats.total_intake_calories != 0) {
      return this.apiService.createFitnessData(data).pipe(
        timeout(60000),
        tap(result => {
          this.databaseService.createFitnessData(result).subscribe();
        }),
        catchError(() => this.databaseService.createFitnessData(data))
      );
    } else {
      return this.databaseService.createFitnessData(data);
    }
  }

  getFitnessDataByYear(year: number): Observable<FitnessData[]> {
    return this.databaseService.getFitnessDataByYear(year).pipe(
      switchMap(dbData => {
        // Start API call in parallel
        this.apiService.getFitnessDataByYear(year).pipe(
          timeout(60000),
          tap(apiData => {
            // Update database with API data when it arrives
            apiData.forEach(item => {
              this.databaseService.createFitnessData(item).subscribe();
            });
          }),
          catchError(() => of(null))
        ).subscribe();
        
        // Return database data immediately
        return of(dbData);
      }),
      catchError(() => {
        // If database fails, try API
        return this.apiService.getFitnessDataByYear(year).pipe(
          timeout(60000),
          tap(apiData => {
            apiData.forEach(item => {
              this.databaseService.createFitnessData(item).subscribe();
            });
          })
        );
      })
    );
  }

  getFitnessDataByMonth(year: number, month: number): Observable<FitnessData[]> {
    return this.databaseService.getFitnessDataByMonth(year, month).pipe(
      switchMap(dbData => {
        // Start API call in parallel
        this.apiService.getFitnessDataByMonth(year, month).pipe(
          timeout(60000),
          tap(apiData => {
            // Update database with API data when it arrives
            apiData.forEach(item => {
              this.databaseService.createFitnessData(item).subscribe();
            });
          }),
          catchError(() => of(null))
        ).subscribe();
        
        // Return database data immediately
        return of(dbData);
      }),
      catchError(() => {
        // If database fails, try API
        return this.apiService.getFitnessDataByMonth(year, month).pipe(
          timeout(60000),
          tap(apiData => {
            apiData.forEach(item => {
              this.databaseService.createFitnessData(item).subscribe();
            });
          })
        );
      })
    );
  }

  getAllFitnessData(): Observable<FitnessData[]> {
    return this.apiService.getAllFitnessData().pipe(
      timeout(60000),
      tap(data => {
        data.forEach(item => {
          this.databaseService.createFitnessData(item).subscribe();
        });
      }),
      catchError((error) => {
        if (error.status === 404 || error.status) {
          return this.databaseService.getAllData();
        }
        return this.databaseService.getAllData();
      })
    );
  }
}