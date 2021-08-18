import { createElement, getElementHeight, getElementWidth } from "../utility/dom-helper";
import { TWEEN } from "three/examples/jsm/libs/tween.module.min.js";

export class ToolBar {
    constructor(el, opt) {
        this.el = el;
        this.isCollapse = false;
        this.htmlNode = {
            toobarFold: null,
            btnArea: null
        };
        this.btnAreaDefaultStyle = {
            height: null,
            width: null
        }
        this.opt = Object.assign({
            setWireframe: () => { }
        })
        this.init();
    }

    init() {

        const viewerBbar = createElement('DIV', 'viewer-bbar');
        const domEl = createElement('DIV', 'btn-area');
        this.htmlNode.viewerBbar = viewerBbar;
        this.htmlNode.btnArea = domEl;

        const toobarFoldHtml = `
          <div class="toobar-fold-btn">
           <div class="btn">
          </div>
        `
        const toobarFold = createElement('DIV', 'toobar-fold normal-height', toobarFoldHtml);
        this.htmlNode.toobarFold = toobarFold;
        this.el.appendChild(viewerBbar);
        viewerBbar.appendChild(toobarFold);
        viewerBbar.appendChild(domEl);

        const that = this;
        toobarFold.addEventListener('click', function () {
            that.collapseToolbar();
        })

        this.createBtn(domEl);
    }

    createBtn(domEl) {
        const that = this;
        const structureBtn = createElement('BUTTON', '');
        structureBtn.setAttribute("title", "模型结构")
        structureBtn.classList.add("structureBtn");
        //todo
        structureBtn.addEventListener('click', () => {
            if (structureBtn.classList == 'structureBtn activate') {
                structureBtn.classList.remove('activate');
            } else {
                structureBtn.classList.add('activate');
            }
        })
        domEl.appendChild(structureBtn);

        const explodeBtn = createElement('BUTTON', '');
        explodeBtn.setAttribute("title", "分解设备")
        explodeBtn.classList.add("explodeBtn");
        //todo
        explodeBtn.addEventListener('click', () => {
            if (explodeBtn.classList == 'explodeBtn activate') {
                explodeBtn.classList.remove('activate');
            } else {
                explodeBtn.classList.add('activate');
            }
        })
        domEl.appendChild(explodeBtn);

        const sliceBtn = createElement('BUTTON', '');
        sliceBtn.setAttribute("title", "剖切设备")
        sliceBtn.setAttribute("class", "sliceBtn");
        //todo
        sliceBtn.addEventListener('click', () => {
            if (sliceBtn.classList == 'sliceBtn activate') {
                sliceBtn.classList.remove('activate');
            } else {
                sliceBtn.classList.add('activate');
            }
        })
        domEl.appendChild(sliceBtn);

        const measurePointBtn = createElement('BUTTON', '');
        measurePointBtn.setAttribute("class", 'measurePointBtn');
        measurePointBtn.setAttribute("title", "测点");
        //todo
        measurePointBtn.addEventListener('click', () => {
            if (measurePointBtn.classList == 'measurePointBtn activate') {
                measurePointBtn.classList.remove('activate');
            } else {
                measurePointBtn.classList.add('activate');
            }
        })
        domEl.appendChild(measurePointBtn);

        const healthDegree = createElement('BUTTON', '');
        healthDegree.setAttribute("class", 'healthDegreeBtn');
        healthDegree.setAttribute("title", "健康度");
        //todo
        healthDegree.addEventListener('click', () => {
            if (healthDegree.classList == 'healthDegreeBtn activate') {
                healthDegree.classList.remove('activate');
            } else {
                healthDegree.classList.add('activate');
            }
        })
        domEl.appendChild(healthDegree);

        const wireframeBtn = createElement('BUTTON', '');
        wireframeBtn.setAttribute("class", 'wireframeBtn');
        wireframeBtn.setAttribute("title", "线框模式");
        //todo
        wireframeBtn.addEventListener('click', () => {
            if (wireframeBtn.classList == 'wireframeBtn activate') {
                wireframeBtn.classList.remove('activate');
            } else {
                wireframeBtn.classList.add('activate');
                that.opt.setWireframe();
            }
        })
        domEl.appendChild(wireframeBtn);

        const SettingBtn = createElement('BUTTON', '');
        SettingBtn.setAttribute('title', '场景设置')
        SettingBtn.classList.add("SettingBtn");
        //todo
        SettingBtn.addEventListener('click', () => {
            if (SettingBtn.classList == 'SettingBtn activate') {
                SettingBtn.classList.remove('activate');
            } else {
                SettingBtn.classList.add('activate');
            }
        })
        domEl.appendChild(SettingBtn);

        const CaremaResetBtn = createElement('BUTTON', '');
        CaremaResetBtn.setAttribute('title', "重置模型");
        CaremaResetBtn.classList.add("CaremaResetBtn");
        //todo
        CaremaResetBtn.addEventListener('click', () => {
            if (CaremaResetBtn.classList == 'CaremaResetBtn activate') {
                CaremaResetBtn.classList.remove('activate');
            } else {
                CaremaResetBtn.classList.add('activate');
            }
        })
        domEl.appendChild(CaremaResetBtn);
    }

    collapseToolbar() {
        let tweenOneParam = null;
        let tweenTwoParam = null;
        let btnAreaDefaultHeight = 60;

        if (!this.isCollapse) {

            let btnAreaHeight = getElementHeight(this.htmlNode.btnArea);
            this.htmlNode.btnArea.style.height = `${btnAreaHeight}px`;
            this.htmlNode.btnArea.style.margin = '10px 0px';
            let btnAreaWidth = getElementWidth(this.htmlNode.btnArea);
            this.btnAreaDefaultStyle.width = `${btnAreaWidth}px`;
            this.btnAreaDefaultStyle.height = `${btnAreaHeight}px`;


            tweenOneParam = [
                { width: btnAreaWidth, opacity: 1 },
                { width: 0, opacity: 0 }
            ];
            this.htmlNode.viewerBbar.classList.add('shrink-state');

            if (btnAreaHeight > 60) {
                this.htmlNode.btnArea.style.margin = '0px';
                tweenTwoParam = [
                    { height: btnAreaHeight },
                    { height: btnAreaDefaultHeight }
                ];

            }
            this.collapseShrinkTween(200, tweenOneParam, tweenTwoParam);
            this.isCollapse = true;

        } else {

            let tweenOneParam = null;
            let tweenTwoParam = null;

            tweenOneParam = [
                { width: 0, opacity: 0 },
                { width: this.btnAreaDefaultStyle.width, opacity: 1 }
            ];

            if (this.btnAreaDefaultStyle.height > 60) {
                tweenTwoParam = [
                    { height: btnAreaDefaultHeight },
                    { height: this.btnAreaDefaultStyle.height }

                ];
            };
            this.htmlNode.viewerBbar.classList.remove('shrink-state');
            this.collapseShrinkTween(200, tweenOneParam, tweenTwoParam, false);
            this.isCollapse = false;

        }
    }

    collapseShrinkTween(time, tweenOneParam, tweenTwoParam) {
        console.log('tweenOneParam', tweenOneParam, tweenTwoParam)

        let foldTweenOne, foldTweenTwo;
        foldTweenOne = new TWEEN.Tween(tweenOneParam[0])
            .to(tweenOneParam[1], time)
            .onUpdate((object) => {
                this.htmlNode.btnArea.style.width = `${object.width}px`;
                this.htmlNode.btnArea.style.opacity = object.opacity;
            })
            .onComplete(() => {

                if (!this.isCollapse) {
                    this.htmlNode.btnArea.removeAttribute('style');
                }
            })
            .easing(TWEEN.Easing.Quadratic.Out)

        if (tweenTwoParam) {

            foldTweenTwo = new TWEEN.Tween(tweenTwoParam[0])
                .to(tweenTwoParam[1], time - 150)
                .onUpdate((object) => {
                    this.htmlNode.btnArea.style.height = object.height;
                })
                .easing(TWEEN.Easing.Quadratic.Out)
        }

        foldTweenOne.start();

        if (foldTweenTwo) {

            foldTweenTwo.delay(100);
            foldTweenTwo.start();

        }

    }
}