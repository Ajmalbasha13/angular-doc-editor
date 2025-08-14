import { Component, ElementRef, QueryList, ViewChildren, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements AfterViewInit {
  pages = [1];
  pageContents = [''];
  activePage = 1;
  private readonly BOTTOM_MARGIN = 80;

  @ViewChildren('page', { read: ElementRef }) pageRefs!: QueryList<ElementRef>;

  ngAfterViewInit() {
    setTimeout(() => document.querySelector<HTMLElement>('[data-page="1"]')?.focus());
  }

  format(command: string) {
    document.execCommand(command, false, '');
  }

  formatBlock(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    document.execCommand('formatBlock', false, value);
  }

  onInput(event: Event, pageIndex: number) {
    const pageEl = event.target as HTMLElement;
    this.pageContents[pageIndex] = pageEl.innerHTML;
    this.splitOverflow(pageIndex);
    this.cleanupPages();
    this.restoreCursor();
  }

  onPaste(event: ClipboardEvent, pageIndex: number) {
    event.preventDefault();
    // Prefer HTML if available, otherwise fallback to plain text
    const htmlData = event.clipboardData?.getData('text/html');
    const textData = event.clipboardData?.getData('text/plain') || '';
    const content = htmlData || textData.replace(/\n/g, '<div>') + '</div>';
    document.execCommand('insertHTML', false, content);

    const pageEl = this.pageRefs.toArray()[pageIndex].nativeElement as HTMLElement;
    this.pageContents[pageIndex] = pageEl.innerHTML;

    // Wait for DOM update before splitting overflow
    setTimeout(() => {
      this.splitOverflow(pageIndex);
      this.cleanupPages();
    });
  }

  private splitOverflow(startIndex: number) {
    let pageIndex = startIndex;

    while (pageIndex < this.pages.length) {
      const pageEl = this.pageRefs.toArray()[pageIndex].nativeElement as HTMLElement;

      while (pageEl.scrollHeight > pageEl.clientHeight) {
        const lastChild = pageEl.lastChild;
        if (!lastChild) break;

        const nextPageIndex = pageIndex + 1;
        if (!this.pages[nextPageIndex]) {
          this.pages.push(this.pages.length + 1);
          this.pageContents.push('');
        }

        const movedContent =
          lastChild instanceof HTMLElement ? lastChild.outerHTML : lastChild.textContent || '';

        pageEl.removeChild(lastChild);
        this.pageContents[pageIndex] = pageEl.innerHTML;
        this.pageContents[nextPageIndex] = movedContent + this.pageContents[nextPageIndex];

        setTimeout(() => {
          const nextEl = this.pageRefs.toArray()[nextPageIndex].nativeElement as HTMLElement;
          nextEl.innerHTML = this.pageContents[nextPageIndex];
        });
      }
      pageIndex++;
    }
  }

  private cleanupPages() {
    for (let i = this.pages.length - 1; i > 0; i--) {
      if (!this.pageContents[i]?.trim() || this.pageContents[i] === '<br>') {
        this.pages.splice(i, 1);
        this.pageContents.splice(i, 1);
      }
    }
  }

  scrollToPage(index: number) {
    this.activePage = index + 1;
    document
      .querySelector(`[data-page="${this.activePage}"]`)
      ?.scrollIntoView({ behavior: 'smooth' });
  }
}
