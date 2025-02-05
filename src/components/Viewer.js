import {
    AmbientLight,
    AnimationMixer,
    AxesHelper,
    Box3,
    Cache,
    CubeTextureLoader,
    DirectionalLight,
    GridHelper,
    HemisphereLight,
    LinearEncoding,
    LoaderUtils,
    LoadingManager,
    PMREMGenerator,
    PerspectiveCamera,
    RGBFormat,
    Scene,
    Group,
    Mesh,
    SkeletonHelper,
    UnsignedByteType,
    Vector3,
    Vector2,
    Raycaster,
    WebGLRenderer,
    sRGBEncoding,
    Color,
    PlaneGeometry,
    ShadowMaterial,
    MeshBasicMaterial,
    TextureLoader,
    PlaneBufferGeometry
} from 'three';
import { GUI } from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { createElement, getElementWidth, getElementHeight } from '../utility/dom-helper';
import '../scss/three-viewer.scss';
import { ToolBar } from './ToolBar';
import { SelectionProxy } from './SelectionProxy';
import { StructureTree } from './StructureTree';
import groundTextureAlphamapPic from '../images/ground_scene.png';

// var createBackground = require('three-vignette-background');

const DEFAULT_CAMERA = '[default]';

export class Viewer {
    constructor(el, options) {
        this.el = el;
        this.options = options;
        this.state = {
            structureTree: false,
            wireframe: false,
            background: false,
            addLights: true,
            exposure: 1.0,
            textureEncoding: 'sRGB',
            ambientIntensity: 0.3,
            ambientColor: 0xFFFFFF,
            directIntensity: 0.8 * Math.PI, // TODO(#116)
            directColor: 0xFFFFFF,
            bgColor1: '#ffffff',
            bgColor2: '#353535',
            playbackSpeed: 0.2,
            actionStates: {},
            firstExpandScalar: 0.1
        }
        this.pickedObject = null;

        this.maxSize = null; //包围盒最大的模型

        this.lights = [];
        this.content = new Group();
        this.content.name = 'sceneRoot';
        this.mixer = null;
        this.clips = [];
        this.gui = null;
        this.prevTime = 0;
        this.gridHelper = null;

        this.stats = new Stats();
        [].forEach.call(this.stats.dom.children, (child) => (child.style.display = ''));
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.top = 'unset';
        this.stats.dom.style.bottom = '0px';
        el.appendChild(this.stats.dom);

        this.scene = new Scene();
        const fov = 45;
        this.defaultCamera = new PerspectiveCamera(fov, el.clientWidth / el.clientHeight, 0.01, 1000);
        this.activeCamera = this.defaultCamera;

        this.scene.add(this.defaultCamera);
        this.renderer = window.renderer = new WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = sRGBEncoding;
        this.renderer.setClearColor(0xffffff, 0);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(el.clientWidth, el.clientHeight);

        this.pmremGenerator = new PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = -10;
        this.controls.screenSpacePanning = true;

        this.el.appendChild(this.renderer.domElement);
        this.addGUI();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        window.addEventListener('resize', this.resize.bind(this), false);

        this.init();
    }

    init() {
        // this.toolbar = new ToolBar(this.el, {
        //     startUpWireframe: (val) => { this.setWireframe(val) },
        //     showStructureTree: (val) => { this.showStructureTree(val) }
        // });

    }


    /**
     * 
     * @param {基于包围盒定位地坪} positionY 
     */
    addGridHelper(box) {

        const ox1 = box.max.x;
        const oy1 = box.max.y;
        const oz1 = box.max.z;

        const ox2 = box.min.x;
        const oy2 = box.min.y;
        const oz2 = box.min.z;

        var baseSize = 1;
        if (Math.abs(ox1 - ox2) > Math.abs(oz1 - oz2)) {
            baseSize = Math.abs(ox1 - ox2);
        } else {
            baseSize = Math.abs(oz1 - oz2);
        }

        this.gridHelper = new GridHelper(baseSize * 40, 100, 0x000000, 0x000000);
        this.gridHelper.material.opacity = 0.2;
        this.gridHelper.material.transparent = true;
        this.gridHelper.position.y = oy2 - oy1;
        this.scene.add(this.gridHelper);

        new TextureLoader().load(
            groundTextureAlphamapPic,
            (texture) => {
                const ground = new Mesh(new PlaneBufferGeometry(baseSize * 2, baseSize * 2), new MeshBasicMaterial({ map: texture }));
                ground.material.transparent = true;
                // ground.receiveShadow = true;
                ground.rotation.x = - Math.PI / 2;
                ground.position.y = oy2 - oy1;
                this.scene.add(ground);
            }
        )

    }

    /**
     * 屏幕点击事件
     * @param {*} e 
     * @returns 
     */
    raycast(e) {
        const { clientHeight, clientWidth } = this.el.parentElement;
        let mouse = new Vector2();
        mouse.x = (e.offsetX / clientWidth) * 2 - 1;
        mouse.y = -(e.offsetY / clientHeight) * 2 + 1;
        let selectNode = [];
        let intersects = [];
        let scene = this.scene;
        let raycaster = this.raycaster;
        raycaster.setFromCamera(mouse, this.activeCamera);
        scene.children.map((item) => {
            if (item instanceof Group) {
                item.children.map((node) => {
                    selectNode.push(node);
                })
            }
        });
        if (selectNode) {
            intersects = raycaster.intersectObjects(selectNode, true);
        }
        this.selectionProxy.clear();
        if (intersects.length > 0) {
            let firstVisibleObjectIndex = -1;
            for (var i = 0, len = intersects.length; i < len; i++) {
                if (intersects[i].object && intersects[i].object.visible == true) {
                    firstVisibleObjectIndex = i;
                    this.currentModeName = intersects[i].object.name;
                    this.currentModePosition = intersects[i].object.position;
                    this.currentCameraLookAt = this.activeCamera.position;
                    console.log('已选中：', intersects[i].object, intersects[i].object.name, intersects[i].object.position, this.activeCamera.position.x, this.activeCamera.position.y, this.activeCamera.position.z);
                    console.log('点击位置：', intersects[i].point)
                    break;
                }
            }

            if (firstVisibleObjectIndex >= 0 && intersects[firstVisibleObjectIndex].object && intersects[firstVisibleObjectIndex].object.uuid) {
                let pickedObject = intersects[firstVisibleObjectIndex].object;
                console.log("x:" + intersects[firstVisibleObjectIndex].point.x + "  y:" + intersects[firstVisibleObjectIndex].point.y + "  z:" + intersects[firstVisibleObjectIndex].point.z);

                if (this.pickedObject && this.pickedObject == pickedObject) {
                    return;
                }
                this.selectionProxy.create(pickedObject);

            }
        }
    }


    gltfLoadCompleted() {
        this.structureTree = new StructureTree(this.el, {
            content: this.content,
            showStructureTree: (val) => { this.showStructureTree(val) },
            seletedByUUId: (id) => { this.seletedByUUId(id) },
            clearSelection: () => { this.clearSelection() }
        })
        this.selectionProxy = new SelectionProxy(this.scene);
        this.raycaster = new Raycaster();
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.oX = e.pageX;
            this.oY = e.pageY;
        }, false);
        this.renderer.domElement.addEventListener('mouseup', (e) => {
            this.fX = e.pageX;
            this.fY = e.pageY;
            if (Math.abs(this.fX - this.oX) < 2 && Math.abs(this.fY - this.oY) < 2) {
                this.raycast.apply(this, [e]);
            }
        }, false);
        this.renderer.domElement.addEventListener('wheel', (e) => {
        }, false);
        this.playAllClips();
    }

    /**
     * 内置动画自动播放
     */
    playAllClips() {
        this.clips.forEach((item) => {
            item.forEach((val) => {
                this.mixer.timeScale = this.state.playbackSpeed;
                this.mixer.clipAction(val).reset().play();
                this.state.actionStates[val.name] = true;
            })
        })
    }

    /**
     * 清除选中部件
     */
    clearSelection() {
        this.selectionProxy.clear();
        this.pickedObject = null;
    }

    /**
     * 
     * @param {通过uuid选中部件} uuid 
     */
    seletedByUUId(uuid) {
        let target = null;
        this.scene.traverse((child) => {
            if (child.uuid == uuid) {
                return target = child;
            }
        });
        if (target) {
            if (this.pickedObject) {
                this.selectionProxy.clear();
            }
            if (target.children.length > 0) {
                target.traverse((val) => {
                    if (val.isMesh) {
                        this.selectionProxy.create(val);
                    }
                });
            } else {
                this.selectionProxy.create(target);
            }
            this.pickedObject = target;
        }
    }


    addGUI() {
        const gui = this.gui = new GUI({ autoPlace: false, width: 260, hideable: true });
        this.el.appendChild(this.gui.domElement);
        const displayFolder = gui.addFolder('显示');
        const envBackgroundCtrl = displayFolder.add(this.state, 'background');
        envBackgroundCtrl.onChange(() => this.updateEnvironment());
        const structureCtl = displayFolder.add(this.state, 'structureTree');
        structureCtl.onChange(() => { this.showStructureTree(this.state.structureTree) })
        const wireframeCtrl = displayFolder.add(this.state, 'wireframe');
        wireframeCtrl.onChange(() => this.setWireframe(this.state.wireframe));
        displayFolder.add(this.controls, 'autoRotate');

        const expandFolder = gui.addFolder("分解");
        const expandCtrl = expandFolder.add(this.state, 'firstExpandScalar', 0, 1);
        expandCtrl.onChange(() => this.expand());
    }

    /**
     * 设置线框模式
     * @param {是否展示线框模式}} val 
     */
    setWireframe(val) {
        const that = this;
        traverseMaterials(that.content, (material) => {
            material.wireframe = val;
        })
    }

    /**
     * 
     * @param {bol是否显示模型结构树} val 
     */
    showStructureTree(val) {
        const structureObj = document.querySelector('.viewer-structure');
        if (val && structureObj) {
            structureObj.style.display = 'block';
        } else {
            structureObj.style.display = 'none';
        }
    }


    resize() {
        const { clientHeight, clientWidth } = this.el.parentElement;
        this.defaultCamera.aspect = clientWidth / clientHeight;
        this.defaultCamera.updateProjectionMatrix();
        this.renderer.setSize(clientWidth, clientHeight);
    }

    updateLights() {
        const state = this.state;
        const lights = this.lights;

        if (state.addLights && !lights.length) {
            this.addLights();
        } else if (!state.addLights && lights.length) {
            this.removeLights();
        }

        this.renderer.toneMappingExposure = state.exposure;

        if (lights.length === 2) {
            lights[0].intensity = state.ambientIntensity;
            lights[0].color.setHex(state.ambientColor);
            lights[1].intensity = state.directIntensity;
            lights[1].color.setHex(state.directColor);
        }
    }

    removeLights() {
        this.lights.forEach((light) => light.parent.remove(light));
        this.lights.length = 0;
    }

    /**
     * 设置灯光组件
     */
    addLights() {
        const state = this.state;
        const light1 = new AmbientLight(state.ambientColor, state.ambientIntensity);
        light1.name = 'ambient_light';
        this.defaultCamera.add(light1);

        const light2 = new DirectionalLight(state.directColor, state.directIntensity);
        light2.position.set(0.5, 0, 0.866); // ~60º
        light2.name = 'main_light';
        this.defaultCamera.add(light2);
        this.lights.push(light1, light2);
    }

    /**
     * 加载高清环境贴图
     */
    updateEnvironment() {
        const environment = {
            id: 'venice-sunset',
            name: 'Venice Sunset',
            path: 'assets/environment/venice_sunset_1k.hdr',
            format: '.hdr'
        };
        this.getCubeMapTexture(environment).then(({ envMap }) => {
            this.scene.environment = envMap;
            this.scene.background = this.state.background ? envMap : null;
        });
    }

    getCubeMapTexture(environment) {
        const { path } = environment;

        // no envmap
        if (!path) return Promise.resolve({ envMap: null });

        return new Promise((resolve, reject) => {

            new RGBELoader()
                .setDataType(UnsignedByteType)
                .load(path, (texture) => {

                    const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
                    this.pmremGenerator.dispose();

                    resolve({ envMap });

                }, undefined, reject);

        });

    }

    updateTextureEncoding() {
        const encoding = this.state.textureEncoding === 'sRGB'
            ? sRGBEncoding
            : LinearEncoding;
        traverseMaterials(this.content, (material) => {
            if (material.map) material.map.encoding = encoding;
            if (material.emissiveMap) material.emissiveMap.encoding = encoding;
            if (material.map || material.emissiveMap) material.needsUpdate = true;
        });
    }

    /**
     * 渲染器定时执行
     * @param {定时执行} time 
     */
    animate(time) {
        requestAnimationFrame(this.animate);
        const dt = (time - this.prevTime) / 1000;
        this.controls.update();
        this.stats.update();
        this.mixer && this.mixer.update(dt);
        this.render();
        this.prevTime = time;
    }

    //渲染器执行
    render() {
        this.renderer.render(this.scene, this.activeCamera);
    }


    setClips(clips) {
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mixer.getRoot());
            this.mixer = null;
        }

        this.clips.push(clips);
        if (!this.clips.length) return;

        this.mixer = new AnimationMixer(this.content);
    }

    /**
      * @param {string} name
      */
    setCamera(name) {
        if (name === DEFAULT_CAMERA) {
            this.controls.enabled = true;
            this.activeCamera = this.defaultCamera;
        } else {
            this.controls.enabled = false;
            this.content.traverse((node) => {
                if (node.isCamera && node.name === name) {
                    this.activeCamera = node;
                }
            });
        }
    }


    /**
     * 
     * 模型爆炸
     */
    expand() {
        this.calcuExpand();
        this.content.traverse((node) => {
            if (!node.isMesh || !node.worldDir) return;
            node.position.copy(new Vector3().copy(node.userData.oldPs).add(new Vector3().copy(node.worldDir).multiplyScalar(this.state.firstExpandScalar)));
        })
    }

    /**
     * 爆炸前记录模型位置信息
     */
    calcuExpand() {
        const modelBox = new Box3().expandByObject(this.content);
        //计算模型的中心坐标，以这个为爆炸中心
        const modelPs = new Vector3().addVectors(modelBox.max, modelBox.min).multiplyScalar(0.5);
        const meshBox = new Box3();
        this.content.traverse((node) => {
            if (node.isMesh) {
                meshBox.setFromObject(node);
                //获取每个mesh的中心点，爆炸方向为爆炸的中心点指向mesh中心点
                var meshPs = new Vector3().addVectors(meshBox.max, meshBox.min).multiplyScalar(0.5);
                if (isNaN(meshPs.x)) return;
                //计算爆炸方向
                node.worldDir = new Vector3().subVectors(meshPs, modelPs).normalize();
                //保存初始坐标
                node.userData.oldPs = node.getWorldPosition(new Vector3());
            }
        })

    }

    setContent(object, clips, loadCallback) {
        // this.clear();
        this.content.add(object);
        const box = new Box3().setFromObject(this.content);
        const size = box.getSize(new Vector3()).length();
        const center = box.getCenter(new Vector3());

        this.gridHelper ? '' : this.addGridHelper(box);

        this.controls.reset(this.content, this.clips);

        this.content.position.x += (this.content.position.x - center.x);
        this.content.position.y += (this.content.position.y - center.y);
        this.content.position.z += (this.content.position.z - center.z);

        this.controls.maxDistance = size * 10;
        this.defaultCamera.near = size / 100;
        this.defaultCamera.far = size * 100;
        this.defaultCamera.updateProjectionMatrix();

        if (this.options.cameraPosition) {

            this.defaultCamera.position.fromArray(this.options.cameraPosition);
            this.defaultCamera.lookAt(new Vector3());

        } else {

            this.defaultCamera.position.copy(center);
            this.defaultCamera.position.x += size / 1.6;
            this.defaultCamera.position.y += size / 4.0;
            this.defaultCamera.position.z += size / 1.6;
            this.defaultCamera.lookAt(center);

        }

        this.setCamera(DEFAULT_CAMERA);

        this.controls.saveState();

        this.scene.add(this.content);

        this.state.addLights = true;

        this.content.traverse((node) => {
            if (node.isLight) {
                this.state.addLights = false;
            } else if (node.isMesh) {
                // TODO(https://github.com/mrdoob/js/pull/18235): Clean up.
                node.material.depthWrite = !node.material.transparent;
            }
        });

        this.setClips(clips);
        this.updateLights();
        // this.updateGUI();
        this.updateEnvironment();
        this.updateTextureEncoding();
        // this.updateDisplay();
        window.content = this.content;
        console.info('[glTF Viewer] Scene exported as `window.content`.');
        // this.printGraph(this.content);
        //模型场景灯光相机所有设置完成
        loadCallback.gltfLoadCompleted(this.content);
    }


    printGraph(node) {

        console.group(' <' + node.type + '> ' + node.name);
        node.children.forEach((child) => this.printGraph(child));
        console.groupEnd();

    }

    load(url, rootPath, assetMap) {
        const baseURL = LoaderUtils.extractUrlBase(url);
        return new Promise((resolve, reject) => {
            //正在加载的文件管理
            const manager = new LoadingManager();
            manager.setURLModifier((url, path) => {
                const normalizedURL = rootPath + decodeURI(url)
                    .replace(baseURL, '')
                    .replace(/^(\.?\/)/, '');
                if (assetMap.has(normalizedURL)) {
                    const blob = assetMap.get(normalizedURL);
                    const blobURL = URL.createObjectURL(blob);
                    blobURLs.push(blobURL);
                    return blobURL;
                }

                return (path || '') + url;
            });
            const loader = new GLTFLoader(manager)
                .setCrossOrigin('anonymous')
                .setDRACOLoader(
                    new DRACOLoader(manager).setDecoderPath('/libs/draco/')
                ).setMeshoptDecoder(MeshoptDecoder);

            const blobURLs = [];
            loader.load(url, (gltf) => {
                const scene = gltf.scene || gltf.scenes[0];
                const clips = gltf.animations || [];
                if (!scene) {
                    throw new Error(
                        'This model contains no scene, and cannot be viewed here. However,'
                        + ' it may contain individual 3D resources.'
                    );
                }
                // this.content.add(scene);
                // this.clips.push(clips);
                this.setContent(scene, clips, { gltfLoadCompleted: this.gltfLoadCompleted.bind(this) });
                blobURLs.forEach(URL.revokeObjectURL);
                resolve(gltf);
            }, undefined, reject);
        });

    }
}

function traverseMaterials(object, callback) {
    object.traverse((node) => {
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
        materials.forEach(callback);
    });
}








