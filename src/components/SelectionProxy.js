import * as THREE from 'three';
import EdgeShader from '../shaders/EdgeShader';

export class SelectionProxy {
    constructor(scene) {
        this.scene = scene;
        this.obj = null;
        this.proxies = [];
    }

    create(pickedObject) {
        let edgeMaterial = new THREE.ShaderMaterial({
            vertexShader: EdgeShader.vertexShader,
            fragmentShader: EdgeShader.fragmentShader,
            uniforms: THREE.UniformsUtils.clone(EdgeShader.uniforms),
            transparent: true,
            depthTest: false
        });
        edgeMaterial.blending = THREE.NormalBlending;
        edgeMaterial.supportsMrtNormals = true;
        let selectionMaterialBase = new THREE.MeshStandardMaterial({ color: 0xF8EC12, opacity: 0.4, transparent: true, metalness: 0.65, roughness: 0.54 });
        let selectionMaterialTop = new THREE.MeshStandardMaterial({ color: 0xF8EC12, opacity: 0.4, transparent: true, metalness: 0.65, roughness: 0.54 });
        selectionMaterialTop.packedNormals = true;
        selectionMaterialBase.packedNormals = true;
        edgeMaterial.depthWrite = false;
        edgeMaterial.depthTest = false;

        selectionMaterialBase.depthWrite = false;
        selectionMaterialBase.depthTest = false;
        if (!pickedObject) return;
        let hiddenEdge = new THREE.Mesh(pickedObject.geometry, selectionMaterialBase);
        hiddenEdge.matrix.copy(pickedObject.matrixWorld);
        hiddenEdge.matrixAutoUpdate = false;
        hiddenEdge.matrixWorldNeedsUpdate = true;
        hiddenEdge.frustumCulled = false;
        this.scene.add(hiddenEdge);
        this.proxies.push(hiddenEdge);

        let topSelectionProxy = new THREE.Mesh(pickedObject.geometry, selectionMaterialTop);
        topSelectionProxy.matrix.copy(pickedObject.matrixWorld);
        topSelectionProxy.matrixAutoUpdate = false;
        topSelectionProxy.matrixWorldNeedsUpdate = true;
        topSelectionProxy.frustumCulled = false;
        this.scene.add(topSelectionProxy);
        this.proxies.push(topSelectionProxy);
        this.obj = pickedObject;
    }

    clear() {
        this.proxies.map((proxy) => this.scene.remove(proxy));
        this.proxies = [];
    }

    sync() {
        this.proxies.map((proxy) => proxy.matrix.copy(this.obj.matrixWorld));
    }


    destroy() {
        this.clear();
        this.scene = null;
        this.obj = null;
        this.proxies = null;
    }
}