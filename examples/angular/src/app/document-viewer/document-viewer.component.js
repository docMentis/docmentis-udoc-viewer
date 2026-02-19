var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, Input, ViewChild, } from "@angular/core";
import { UDocClient } from "@docmentis/udoc-viewer";
let DocumentViewerComponent = class DocumentViewerComponent {
    constructor() {
        this.client = null;
        this.viewer = null;
    }
    async ngOnInit() {
        try {
            this.client = await UDocClient.create();
            this.viewer = await this.client.createViewer({
                container: this.containerRef.nativeElement,
            });
            await this.viewer.load(this.url);
        }
        catch (error) {
            console.error("Failed to initialize UDoc Viewer:", error);
        }
    }
    ngOnDestroy() {
        this.viewer?.destroy();
        this.client?.destroy();
    }
};
__decorate([
    ViewChild("container", { static: true })
], DocumentViewerComponent.prototype, "containerRef", void 0);
__decorate([
    Input()
], DocumentViewerComponent.prototype, "url", void 0);
DocumentViewerComponent = __decorate([
    Component({
        selector: "app-document-viewer",
        standalone: true,
        template: `<div #container style="width: 100%; height: 100vh"></div>`,
    })
], DocumentViewerComponent);
export { DocumentViewerComponent };
