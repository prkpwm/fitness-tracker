import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap, switchMap, map } from 'rxjs/operators';
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
      switchMap(apiData => {
        return this.databaseService.getFitnessDataByDate(date).pipe(
          map(dbData => {
            if (dbData.last_update && apiData.last_update) {
              const dbTime = new Date(dbData.last_update.replace(' ', 'T')).getTime();
              const apiTime = new Date(apiData.last_update.replace(' ', 'T')).getTime();
              if (dbTime > apiTime) {
                return { data: dbData, source: 'database' };
              }
            }
            return { data: apiData, source: 'api' };
          }),
          catchError(() => of({ data: apiData, source: 'api' }))
        );
      }),
      tap(result => {
        if (result.source === 'api') {
          this.databaseService.createFitnessData(result.data).subscribe();
        }
      }),
      map(result => result.data),
      catchError((error) => {
        if (error.status === 404 || error.status) {
          return this.databaseService.getFitnessDataByDate(date).pipe(
            tap(data => {
              if (data.daily_total_stats.total_intake_calories != 0) {
                this.apiService.createFitnessData(data).subscribe();
              }
            }),
          );
        }
        return this.databaseService.getFitnessDataByDate(date).pipe(
          tap(data => {
            if (data.daily_total_stats.total_intake_calories != 0) {
              this.apiService.createFitnessData(data).subscribe();
            }
          })
        );
      })
    );
  }

  createFitnessData(data: FitnessData): Observable<FitnessData> {
    if (data.daily_total_stats.total_intake_calories != 0) {
      return this.apiService.createFitnessData(data).pipe(
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
    return this.apiService.getFitnessDataByYear(year).pipe(
      tap(data => {
        data.forEach(item => {
          this.databaseService.createFitnessData(item).subscribe();
        });
      }),
      catchError((error) => {
        if (error.status === 404 || error.status) {
          return this.databaseService.getFitnessDataByYear(year);
        }
        return this.databaseService.getFitnessDataByYear(year);
      })
    );
  }

  getFitnessDataByMonth(year: number, month: number): Observable<FitnessData[]> {
    return this.apiService.getFitnessDataByMonth(year, month).pipe(
      tap(data => {
        data.forEach(item => {
          this.databaseService.createFitnessData(item).subscribe();
        });
      }),
      catchError((error) => {
        if (error.status === 404 || error.status) {
          return this.databaseService.getFitnessDataByMonth(year, month);
        }
        return this.databaseService.getFitnessDataByMonth(year, month);
      })
    );
  }

  getAllFitnessData(): Observable<FitnessData[]> {
    return this.apiService.getAllFitnessData().pipe(
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