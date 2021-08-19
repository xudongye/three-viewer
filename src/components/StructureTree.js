import { createElement } from "../utility/dom-helper";
import * as JsonView from './JSONView';

export class StructureTree {
    constructor(el, opt) {
        this.el = el;
        this.content = opt.content;
        this.opt = Object.assign({
            showStructureTree: (val) => { },
            seletedByUUId: (id) => { },
            clearSelection: () => { }
        }, opt || {});

        this.init();
    }

    init() {

        const that = this;
        const domEl = createElement('DIV', 'viewer-structure scrollbar-style');
        const closeBtn = `
          <div class='panel-title'> 
            <p>模型</p>
            <div class='panel-close-btn'></div>
          </div>
          <div class='panel-control'>
            <div class='control-show-bnt'> 全部显示</div>
            <div style='clear:both'></div>
          </div>
        `;
        domEl.innerHTML = closeBtn;
        this.el.appendChild(domEl);
        JsonView.renderJSON(that.content, domEl, {
            onClick: (id) => this.onLineNodeClick(id)
        })

        document.querySelector('.panel-close-btn').addEventListener('click', () => {
            this.opt.showStructureTree(false);
        })
    }

    onLineNodeClick(id) {
        let lineNode = document.querySelector(".line.active");
        if (lineNode) {
            lineNode.classList.remove('active');
            this.opt.clearSelection();
        } else {
            let htmlNOde = document.querySelector('.line [data-id="' + id + '"]');
            htmlNOde = htmlNOde.parentNode;
            htmlNOde.classList.add('active');
            this.opt.seletedByUUId(id);
        }
    }
}