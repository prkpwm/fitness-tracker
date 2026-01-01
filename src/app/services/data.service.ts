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
      catchError(() => {
        // Fallback to local database
        return this.databaseService.getFitnessDataByDate(date).pipe(
          tap(data => {
            // Retry API call in background
            this.apiService.createFitnessData(data).subscribe();
          })
        );
      })
    );
  }

  createFitnessData(data: FitnessData): Observable<FitnessData> {
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
  }

  getAllFitnessData(): Observable<FitnessData[]> {
    return this.apiService.getAllFitnessData().pipe(
      tap(data => {
        // Cache all data to local database
        data.forEach(item => {
          this.databaseService.createFitnessData(item).subscribe();
        });
      }),
      catchError(() => {
        // Fallback to local database
        return this.databaseService.getAllData();
      })
    );
  }
}