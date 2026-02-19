import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { UDocClient } from "@docmentis/udoc-viewer";

@Component({
  selector: "app-document-viewer",
  standalone: true,
  template: `<div #container style="width: 100%; height: 100vh"></div>`,
})
export class DocumentViewerComponent implements OnInit, OnDestroy {
  @ViewChild("container", { static: true })
  containerRef!: ElementRef<HTMLDivElement>;
  @Input() url!: string;

  private client: any = null;
  private viewer: any = null;

  async ngOnInit() {
    try {
      this.client = await UDocClient.create();

      this.viewer = await this.client.createViewer({
        container: this.containerRef.nativeElement,
      });

      await this.viewer.load(this.url);
    } catch (error) {
      console.error("Failed to initialize UDoc Viewer:", error);
    }
  }

  ngOnDestroy() {
    this.viewer?.destroy();
    this.client?.destroy();
  }
}
