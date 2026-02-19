import { Component } from "@angular/core";
import { DocumentViewerComponent } from "./document-viewer/document-viewer.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [DocumentViewerComponent],
  template: `
    <main>
      <app-document-viewer [url]="'/sample.pdf'" />
    </main>
  `,
})
export class AppComponent {}
