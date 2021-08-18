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
    SkeletonHelper,
    UnsignedByteType,
    Vector3,
    WebGLRenderer,
    sRGBEncoding,
} from 'three';
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

// var createBackground = require('three-vignette-background');

const DEFAULT_CAMERA = '[default]';

export class Viewer {
    constructor(el, options) {
        this.el = el;
        this.options = options;
        this.state = {
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
            bgColor2: '#353535'
        }

        this.lights = [];
        this.content = null;
        this.mixer = null;
        this.clips = [];
        this.prevTime = 0;

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
        this.renderer = window.renderer = new WebGLRenderer({ antialias: true });
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = sRGBEncoding;
        this.renderer.setClearColor(0xcccccc);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(el.clientWidth, el.clientHeight);

        this.pmremGenerator = new PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = -10;
        this.controls.screenSpacePanning = true;

        this.el.appendChild(this.renderer.domElement);

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        window.addEventListener('resize', this.resize.bind(this), false);

        this.init();
    }

    init() {
        this.toolbar = new ToolBar(this.el, {
            setWireframe: () => { this.setWireframe() }
        })

    }

    setWireframe() {
        debugger
        traverseMaterials(this.content, (material) => {
            material.wireframe = this.state.wireframe;
        })
    }


    resize() {
        const { clientHeight, clientWidth } = this.el.parentElement;
        this.defaultCamera.aspect = clientWidth / clientHeight;
        this.defaultCamera.updateProjectionMatrix();
        this.renderer.setSize(clientWidth, clientHeight);
    }

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

    /**
     * @param {Array<AnimationClip} clips
     */
    setClips(clips) {
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mixer.getRoot());
            this.mixer = null;
        }

        this.clips = clips;
        if (!clips.length) return;

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

    setContent(object, clips) {
        // this.clear();

        const box = new Box3().setFromObject(object);
        const size = box.getSize(new Vector3()).length();
        const center = box.getCenter(new Vector3());

        this.controls.reset(object, clips);

        object.position.x += (object.position.x - center.x);
        object.position.y += (object.position.y - center.y);
        object.position.z += (object.position.z - center.z);

        this.controls.maxDistance = size * 10;
        this.defaultCamera.near = size / 100;
        this.defaultCamera.far = size * 100;
        this.defaultCamera.updateProjectionMatrix();

        if (this.options.cameraPosition) {

            this.defaultCamera.position.fromArray(this.options.cameraPosition);
            this.defaultCamera.lookAt(new Vector3());

        } else {

            this.defaultCamera.position.copy(center);
            this.defaultCamera.position.x += size / 1.4;
            this.defaultCamera.position.y += size / 4.0;
            this.defaultCamera.position.z += size / 1.4;
            this.defaultCamera.lookAt(center);

        }

        this.setCamera(DEFAULT_CAMERA);

        this.controls.saveState();

        this.scene.add(object);
        this.content = object;

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
        this.addLights();
        // this.updateLights();
        // this.updateGUI();
        this.updateEnvironment();
        this.updateTextureEncoding();
        // this.updateDisplay();
        window.content = this.content;
        console.info('[glTF Viewer] Scene exported as `window.content`.');
        this.printGraph(this.content);
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
                this.setContent(scene, clips);
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








