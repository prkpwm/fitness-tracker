import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-json-interface',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './json-interface.html',
  styleUrl: './json-interface.css'
})
export class JsonInterfaceComponent implements OnInit {
  rawJson = '';
  date = new Date().toISOString().split('T')[0];

  constructor(private databaseService: DatabaseService) {}

  ngOnInit() {
    this.loadJson();
  }

  loadJson() {
    this.databaseService.getRawJsonFromDB(this.date).subscribe({
      next: (data) => this.rawJson = data,
      error: (err) => this.rawJson = `Error: ${err.message}`
    });
  }
}