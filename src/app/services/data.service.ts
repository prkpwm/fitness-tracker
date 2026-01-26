import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { catchError, tap, switchMap, timeout } from 'rxjs/operators';
import { ApiService } from './api.service';
import { DatabaseService } from './database.service';
import { FitnessData } from '../models/fitness.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dataUpdateSubject = new Subject<void>();
  public dataUpdate$ = this.dataUpdateSubject.asObservable();

  constructor(
    private readonly apiService: ApiService,
    private readonly databaseService: DatabaseService
  ) {}

  private shouldReloadPage(apiData: FitnessData | FitnessData[], dbData: FitnessData | FitnessData[]): boolean {
    if (Array.isArray(apiData) && Array.isArray(dbData)) {
      // For arrays, check if any API item has newer lastUpdate than corresponding DB item
      return apiData.some(apiItem => {
        const dbItem = dbData.find(db => db.date === apiItem.date);
        if (!dbItem || !apiItem.last_update) return false;
        
        const apiTime = new Date(apiItem.last_update).getTime();
        const dbTime = dbItem.last_update ? new Date(dbItem.last_update).getTime() : 0;
        return apiTime > dbTime;
      });
    } else if (!Array.isArray(apiData) && !Array.isArray(dbData)) {
      // For single items
      if (!apiData.last_update || !dbData.last_update) return false;
      
      const apiTime = new Date(apiData.last_update).getTime();
      const dbTime = new Date(dbData.last_update).getTime();
      return apiTime > dbTime;
    }
    return false;
  }

  private triggerDataUpdate(): void {
    setTimeout(() => {
      this.dataUpdateSubject.next();
    }, 1000); // Small delay to ensure data is saved first
  }

  getFitnessDataByDate(date: string): Observable<FitnessData> {
    return this.databaseService.getFitnessDataByDate(date).pipe(
      switchMap(dbData => {
        // Start API call in parallel
        this.apiService.getFitnessDataByDate(date).pipe(
          timeout(60000),
          tap(apiData => {
            // Update database with API data when it arrives
            this.databaseService.createFitnessData(apiData).subscribe();
            
            // Check if page should reload due to newer data
            if (this.shouldReloadPage(apiData, dbData)) {
              this.triggerDataUpdate();
            }
          }),
          catchError(() => {
            // If API fails, try to sync local data to API
            if (dbData.daily_total_stats.total_intake_calories > 0) {
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
    if (data.daily_total_stats.total_intake_calories > 0) {
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
            
            // Check if page should reload due to newer data
            if (this.shouldReloadPage(apiData, dbData)) {
              this.triggerDataUpdate();
            }
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
            
            // Check if page should reload due to newer data
            if (this.shouldReloadPage(apiData, dbData)) {
              this.triggerDataUpdate();
            }
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