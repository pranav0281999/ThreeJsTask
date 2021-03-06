import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

function main() {
    addEventListener("wheel", onMouseWheel);

    let textureLoadCount = 0;

    const canvas: HTMLCanvasElement = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({canvas: canvas});

    const vertShader = document.getElementById('vertex_shader').innerHTML;
    const fragShader = document.getElementById('fragment_shader').innerHTML;

    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const fov = 75;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 5;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 2;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;

    const scene = new THREE.Scene();

    //Render target to use as texture for spline
    const rtWidth = 512;
    const rtHeight = 512;
    const renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);

    const rtCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 0.3);
    rtCamera.position.z = 0.2;

    const rtScene = new THREE.Scene();

    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);

    const loader = new THREE.TextureLoader();

    let uniforms = {
        tOne: {type: "t", value: loader.load("resources/somepng.png", textureLoaded)},
        tSec: {type: "t", value: loader.load("resources/somebackground.jpeg", textureLoaded)}
    };

    //counting the loaded textures to stop redundant rendering of render target scene
    function textureLoaded(texture) {
        setTimeout(() => {
            textureLoadCount++;
        }, 10);
    }

    const planeMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertShader,
        fragmentShader: fragShader,
        side: THREE.DoubleSide
    });

    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    scene.add(planeMesh);

    //plane inside render target scene, setup with orthogonal camera to cover the scene completely
    const rtPlaneMesh = new THREE.Mesh(planeGeo, planeMat);
    rtScene.add(rtPlaneMesh);

    //using render target as texture
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: renderTarget.texture}));
    sprite.position.set(1, 0, 0);
    scene.add(sprite);

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const width = canvas.clientWidth * pixelRatio | 0;
        const height = canvas.clientHeight * pixelRatio | 0;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    function render(time) {
        time *= 0.001;

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        controls.update();

        if (textureLoadCount < 2) {
            renderer.setRenderTarget(renderTarget);
            renderer.render(rtScene, rtCamera);
            renderer.setRenderTarget(null);
        }

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    function onMouseWheel(evt) {
        mouse.x = (evt.x / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = 1 - (evt.y / renderer.domElement.clientHeight) * 2;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(planeMesh);

        if (intersects.length > 0) {
            let vector = new THREE.Vector3(mouse.x, mouse.y, 0), factor = 0.05;

            vector.unproject(camera);
            vector.sub(camera.position);

            if (evt.deltaY < 0) {
                if (camera.position.distanceTo(intersects[0].point) > 1) {
                    camera.position.addVectors(camera.position, vector.setLength(factor));
                    controls.target.addVectors(controls.target, vector.setLength(factor));
                }
            } else {
                camera.position.subVectors(camera.position, vector.setLength(factor));
                controls.target.subVectors(controls.target, vector.setLength(factor));
            }

            camera.updateProjectionMatrix();
        }
    }
}

main();
