import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('rio-3d-stage');

if (host) {
  const canvas = host.querySelector('canvas');
  const fallback = host.querySelector('.rio-3d-fallback');
  const loading = host.querySelector('.rio-3d-loading');
  const loadingBar = host.querySelector('.rio-3d-loading-bar');
  const modeLabel = host.querySelector('.rio-3d-mode');
  const exploreButton = host.querySelector('.rio-3d-explore');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stageNames = ['Sense', 'Disinfect', 'Dose', 'Route', 'Backwash'];
  const stageDetails = [
    'Live water analysis',
    'UV-C + salt treatment',
    'Automatic chemical balance',
    'Motorised water paths',
    'Reverse-flow filter cleaning'
  ];

  const cameraStates = [
    { target: [3.30, 1.22, 0.18], theta: -12, phi: 75, radius: 2.18 },
    { target: [3.31, 1.62, 0.18], theta:  14, phi: 74, radius: 2.14 },
    { target: [3.35, 0.66, 0.20], theta: -16, phi: 72, radius: 2.22 },
    { target: [4.22, 1.12, 0.08], theta:   8, phi: 77, radius: 7.26 },
    { target: [2.66, 0.62, 0.20], theta: -18, phi: 73, radius: 3.52 }
  ];

  const flowPaths = [
    {
      color: 0x67c7ff,
      points: [[2.93, 1.20, .43], [3.18, 1.20, .45], [3.52, 1.20, .45], [3.72, 1.23, .40]]
    },
    {
      color: 0x38a6ff,
      points: [[3.03, 1.68, .42], [3.20, 1.78, .43], [3.54, 1.78, .43], [3.78, 1.72, .40]]
    },
    {
      color: 0x73b9ff,
      points: [[3.10, .18, .42], [3.14, .48, .44], [3.23, .78, .44], [3.32, 1.12, .43]]
    },
    {
      color: 0x3da8ff,
      points: [[6.18, .83, .34], [5.20, .55, .34], [4.22, .54, .34], [3.55, .78, .40], [3.73, 1.58, .40], [3.46, 1.89, .40], [2.72, 1.82, .40]]
    },
    {
      color: 0xb48a62,
      reverse: true,
      points: [[3.55, .76, .40], [2.96, .68, .38], [2.50, .61, .38], [2.24, .60, .38], [2.22, .92, .38], [2.62, .91, .38]]
    }
  ];

  let renderer;
  let scene;
  let camera;
  let controls;
  let rioRoot;
  let flowGroup;
  let flowCurve;
  let flowParticles = [];
  let waterMaterial;
  let pathWaterMaterial;
  let waterMeshes = [];
  let waterLights = [];
  let studioAmbient;
  const presentationShells = [];
  let highlighted = [];
  let currentStage = 0;
  let loaded = false;
  let visible = false;
  let exploring = false;
  let raf = 0;
  let lastTime = performance.now();

  const cameraNow = {
    target: new THREE.Vector3(...cameraStates[0].target),
    theta: cameraStates[0].theta,
    phi: cameraStates[0].phi,
    radius: cameraStates[0].radius
  };
  const cameraGoal = {
    target: cameraNow.target.clone(),
    theta: cameraNow.theta,
    phi: cameraNow.phi,
    radius: cameraNow.radius
  };

  function init() {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.15 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .86;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene = new THREE.Scene();
    scene.environment = pmrem.fromScene(new RoomEnvironment(), .035).texture;
    pmrem.dispose();

    camera = new THREE.PerspectiveCamera(34, 1, 0.025, 80);
    controls = new OrbitControls(camera, canvas);
    controls.enabled = false;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = .42;
    controls.maxDistance = 10;
    controls.target.copy(cameraNow.target);

    scene.add(new THREE.HemisphereLight(0xc8ddff, 0x04080d, 1.04));
    studioAmbient = new THREE.AmbientLight(0xa9c8ef, .52);
    scene.add(studioAmbient);
    const key = new THREE.DirectionalLight(0xfff7ed, 2.05);
    key.position.set(4.5, 5.5, 5.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -.00018;
    key.shadow.normalBias = .018;
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -3;
    key.shadow.camera.near = .5;
    key.shadow.camera.far = 14;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x287cff, 2.25);
    rim.position.set(-3.2, 2.5, -3.8);
    scene.add(rim);
    const studioFill = new THREE.RectAreaLight(0xc0d8ff, 4.8, 10, 4.5);
    studioFill.position.set(4.1, 3.4, 5.8);
    studioFill.lookAt(4.1, 1.0, 0);
    scene.add(studioFill);
    const waterLight = new THREE.PointLight(0x1398ff, 2.4, 4.2, 2);
    waterLight.position.set(3.25, 1.25, 1.25);
    scene.add(waterLight);
    const filterFill = new THREE.PointLight(0xa8cbff, 4.4, 5.4, 2);
    filterFill.position.set(2.12, 1.34, 2.15);
    scene.add(filterFill);
    const plantFill = new THREE.PointLight(0x9bc4ff, 4.0, 6.2, 2);
    plantFill.position.set(5.85, 1.25, 2.35);
    scene.add(plantFill);
    [[3.08, 1.28, .62], [3.48, 1.74, .58], [3.30, .78, .52]].forEach(([x, y, z], i) => {
      const led = new THREE.PointLight(i === 1 ? 0x54caff : 0x168cff, 1.55, 1.1, 2);
      led.position.set(x, y, z);
      scene.add(led);
      waterLights.push(led);
    });

    setCameraImmediately(getCameraState(currentStage));
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const loader = new GLTFLoader();
    loader.load(
      'KW_Media/KW3D/KW2000_V02.glb',
      gltf => prepareModel(gltf.scene),
      event => {
        if (!event.total || !loadingBar) return;
        loadingBar.style.transform = `scaleX(${Math.min(1, event.loaded / event.total)})`;
      },
      () => showFallback()
    );
  }

  function showFallback() {
    host.classList.add('is-fallback');
    if (loading) loading.textContent = 'Static product view';
    if (fallback) fallback.hidden = false;
  }

  function prepareModel(root) {
    rioRoot = root;
    root.updateMatrixWorld(true);

    const bounds = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    const remove = [];
    const transparentFlowCandidates = [];
    const clutter = /(^|\b)(arrow|label|water in|water out|from spa|floor_drain)|kw1200|kw1400|waste#|vacuum#|filter#|ph#|hcl#|sensors(?:\.|$)/i;

    root.children.forEach(object => {
      bounds.setFromObject(object);
      if (bounds.isEmpty()) {
        remove.push(object);
        return;
      }
      bounds.getCenter(center);
      bounds.getSize(size);

      const inWorkingArea = center.x > .45 && center.x < 7.20 && center.y > -0.22 && center.y < 2.69 && center.z > -1.12 && center.z < 1.36;
      const sceneFurniture = size.x > 2.70 || size.y > 2.75 || size.z > 2.45;
      const openLidState = center.x > 2.42 && center.x < 4.18 && center.y > 2.255 && center.y < 2.69;
      const helperGeometry = clutter.test(object.name || '');
      const isWaterTank = center.x > 5.15 && center.x < 6.95 && size.x > .48 && size.y > .48;
      const isSandFilter = (/sand filter|^c-filter$/i.test(object.name || '') || (center.x > .45 && center.x < 2.75)) && size.x > .38 && size.y > .38;
      const equipmentFinish = isWaterTank ? 'tank' : isSandFilter ? 'filter' : '';

      if (!inWorkingArea || sceneFurniture || openLidState || helperGeometry) {
        remove.push(object);
        return;
      }

      object.traverse(child => {
        if (!child.isMesh) return;
        child.frustumCulled = true;
        child.castShadow = true;
        child.receiveShadow = true;
        if (Array.isArray(child.material)) {
          child.material = child.material.map(material => refineMaterial(material, child.name, equipmentFinish));
        } else if (child.material) {
          child.material = refineMaterial(child.material, child.name, equipmentFinish);
        }
        if (isTransparentProcessTube(child)) transparentFlowCandidates.push(child);
      });
    });

    remove.forEach(object => root.remove(object));
    scene.add(root);
    addWaterInsideTubes(transparentFlowCandidates.filter(mesh => root.getObjectById(mesh.id)));
    addControllerBackplate();
    addAcrylicFront();
    buildHighlightIndex();
    setFlow(currentStage);
    setHighlight(currentStage);
    setPresentationMode(currentStage);

    loaded = true;
    host.classList.add('is-loaded');
    if (fallback) fallback.hidden = false;
    if (loading) loading.hidden = true;
    resize();
    startRendering();
  }

  function refineMaterial(source, objectName = '', equipmentFinish = '') {
    const sourceName = (source.name || '').toLowerCase();
    const meshName = (objectName || '').toLowerCase();
    const isTransparentTint = /^(material17|material24|material41|material42)$/.test(sourceName);
    const isGlass = /glass|translucent/.test(sourceName) || isTransparentTint;
    const isPipe = /pipe|elbow|tjoin|joint|codo|fixture/.test(meshName) || /material1|material12/.test(sourceName);
    const isValveMotor = /kw1000-mv|motor|pump|salt cell/.test(meshName);
    const isMetal = /metal|steel|aluminum|aluminium/.test(sourceName);

    if (equipmentFinish) {
      return new THREE.MeshPhysicalMaterial({
        name: source.name,
        color: new THREE.Color(equipmentFinish === 'filter' ? 0x2b323a : 0x46515d),
        roughness: equipmentFinish === 'filter' ? .26 : .36,
        metalness: equipmentFinish === 'filter' ? .16 : .10,
        clearcoat: equipmentFinish === 'filter' ? .58 : .30,
        clearcoatRoughness: .20,
        envMapIntensity: 1.42,
        emissive: new THREE.Color(equipmentFinish === 'filter' ? 0x080d13 : 0x09121b),
        emissiveIntensity: .30,
        side: THREE.DoubleSide
      });
    }

    if (isGlass) {
      const glassMaterial = new THREE.MeshPhysicalMaterial({
        name: source.name,
        color: new THREE.Color(isTransparentTint ? 0x138ce0 : 0x617586),
        transparent: true,
        opacity: isTransparentTint ? .25 : .11,
        transmission: isTransparentTint ? .78 : .95,
        thickness: .018,
        ior: 1.46,
        roughness: isTransparentTint ? .055 : .025,
        metalness: 0,
        clearcoat: .82,
        clearcoatRoughness: .045,
        envMapIntensity: 1.8,
        attenuationColor: new THREE.Color(isTransparentTint ? 0x0875d9 : 0x6e9aaa),
        attenuationDistance: .42,
        emissive: new THREE.Color(isTransparentTint ? 0x0058c7 : 0x061e2f),
        emissiveIntensity: isTransparentTint ? 1.08 : .16,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      glassMaterial.userData.rioProcessGlass = true;
      return glassMaterial;
    }

    if (isPipe || isValveMotor) {
      const pvcColour = sourceName === 'material1' ? 0x303740 : 0x22272d;
      return new THREE.MeshPhysicalMaterial({
        name: source.name,
        color: new THREE.Color(isValveMotor ? 0x101318 : pvcColour),
        roughness: isValveMotor ? .27 : .31,
        metalness: isValveMotor ? .18 : .04,
        clearcoat: isValveMotor ? .62 : .48,
        clearcoatRoughness: .19,
        envMapIntensity: 1.38,
        side: THREE.FrontSide
      });
    }

    const industrialNeutrals = {
      material4: 0x15191f,
      material: 0x353b43,
      material2: 0x3c434c,
      material3: 0x4d5660,
      material9: 0x343b43,
      defaultmaterial: 0x353c45
    };
    if (Object.prototype.hasOwnProperty.call(industrialNeutrals, sourceName)) {
      return new THREE.MeshPhysicalMaterial({
        name: source.name,
        color: new THREE.Color(industrialNeutrals[sourceName]),
        roughness: sourceName === 'material4' ? .28 : .38,
        metalness: sourceName === 'material4' ? .17 : .08,
        clearcoat: sourceName === 'material4' ? .62 : .28,
        clearcoatRoughness: .22,
        envMapIntensity: 1.3,
        side: THREE.FrontSide
      });
    }

    const material = source.clone();
    material.side = THREE.FrontSide;
    if ('roughness' in material) {
      if (isMetal) {
        material.metalness = .78;
        material.roughness = .27;
        material.envMapIntensity = 1.45;
      } else {
        if (material.color) {
          const luminance = material.color.r * .2126 + material.color.g * .7152 + material.color.b * .0722;
          if (luminance > .72) material.color.multiply(new THREE.Color(.58, .62, .68));
        }
        material.roughness = Math.min(.68, Math.max(.22, material.roughness ?? .5));
        material.metalness = Math.min(.5, material.metalness ?? 0);
      }
    }
    return material;
  }

  function isTransparentProcessTube(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const glass = materials.some(material => material?.userData?.rioProcessGlass || /glass|translucent/i.test(material?.name || ''));
    if (!glass) return false;

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z);
    const withinController = center.x > 2.72 && center.x < 3.82 && center.y > .72 && center.y < 2.08 && center.z > -.18 && center.z < .62;
    return withinController && longest > .055;
  }

  function addWaterInsideTubes(meshes) {
    waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormalWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPosition = world.xyz;
          vNormalWorld = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec3 vWorldPosition;
        varying vec3 vNormalWorld;
        void main() {
          float travel = vWorldPosition.x * 20.0 + vWorldPosition.y * 13.0 + vWorldPosition.z * 8.0 - uTime * 5.4;
          float band = smoothstep(.48, 1.0, sin(travel) * .5 + .5);
          float ripple = smoothstep(.22, 1.0, sin(travel * .37 + uTime * 1.7) * .5 + .5);
          float edge = pow(1.0 - abs(dot(normalize(vNormalWorld), vec3(0.0, 0.0, 1.0))), 1.8);
          vec3 deepBlue = vec3(.01, .22, .92);
          vec3 ledBlue = vec3(.08, .82, 1.0);
          vec3 colour = mix(deepBlue, ledBlue, band * .78 + edge * .32);
          float alpha = (.44 + band * .72 + ripple * .18 + edge * .28) * uIntensity;
          gl_FragColor = vec4(colour, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    waterMeshes = meshes.map(mesh => {
      const water = new THREE.Mesh(mesh.geometry, waterMaterial);
      water.name = 'rio_water_inside_tube';
      water.renderOrder = 3;
      water.scale.setScalar(.965);
      mesh.add(water);
      return water;
    });
  }

  function addAcrylicFront() {
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x7abaff,
      transparent: true,
      opacity: .075,
      transmission: .34,
      thickness: .018,
      roughness: .08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: .08,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.34, .012), material);
    pane.name = 'rio_acrylic_front';
    pane.position.set(3.31, 1.38, .455);
    pane.renderOrder = 5;
    scene.add(pane);
    presentationShells.push(pane);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(pane.geometry),
      new THREE.LineBasicMaterial({ color: 0x6fbaff, transparent: true, opacity: .34 })
    );
    edges.position.copy(pane.position);
    edges.renderOrder = 6;
    scene.add(edges);
    presentationShells.push(edges);
  }

  function addControllerBackplate() {
    const plateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x080c12,
      roughness: .24,
      metalness: .34,
      clearcoat: .66,
      clearcoatRoughness: .18,
      envMapIntensity: 1.55
    });
    const plateGeometry = new THREE.BoxGeometry(1.57, 1.43, .035);
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.name = 'rio_powder_coated_backplate';
    plate.position.set(3.31, 1.43, .035);
    plate.renderOrder = -1;
    scene.add(plate);
    presentationShells.push(plate);

    const plateEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(plateGeometry),
      new THREE.LineBasicMaterial({ color: 0x303a47, transparent: true, opacity: .62 })
    );
    plateEdge.position.copy(plate.position);
    plateEdge.renderOrder = 1;
    scene.add(plateEdge);
    presentationShells.push(plateEdge);
  }

  function buildHighlightIndex() {
    highlighted = [[], [], [], [], []];
    rioRoot.traverse(object => {
      if (!object.isMesh) return;
      const name = (object.name || '').toLowerCase();
      if (/sensor|probe|flow|orp|tds/.test(name)) highlighted[0].push(object);
      if (/salt|uv|chlor/.test(name)) highlighted[1].push(object);
      if (/hcl|ph-|dispenser|canister/.test(name)) highlighted[2].push(object);
      if (/valve|mv63|pipe|joint|elbow|tjoin/.test(name)) highlighted[3].push(object);
      if (/sand filter|backwash|inverter|filter/.test(name)) highlighted[4].push(object);

      object.userData.rioBaseMaterial = object.material;
    });
  }

  function setHighlight(stage) {
    if (!rioRoot) return;
    rioRoot.traverse(object => {
      if (!object.isMesh || !object.userData.rioBaseMaterial) return;
      object.material = object.userData.rioBaseMaterial;
    });

    highlighted[stage].slice(0, 180).forEach(object => {
      const base = object.userData.rioBaseMaterial;
      if (!base || Array.isArray(base)) return;
      const material = base.clone();
      if ('emissive' in material) {
        material.emissive = new THREE.Color(stage === 4 ? 0x5f351b : 0x073b73);
        material.emissiveIntensity = stage === 4 ? .32 : .28;
      }
      object.material = material;
    });
  }

  function setPresentationMode(stage) {
    const isWidePhotorealStage = stage === 3 || stage === 4;
    if (rioRoot) rioRoot.visible = !isWidePhotorealStage;
    presentationShells.forEach(object => { object.visible = !isWidePhotorealStage; });
    if (flowGroup) flowGroup.visible = stage !== 2;
    flowParticles.forEach(particle => { particle.visible = isWidePhotorealStage; });
  }

  function setFlow(stage) {
    if (flowGroup) scene.remove(flowGroup);
    flowGroup = new THREE.Group();
    flowGroup.name = 'rio_water_flow';
    flowParticles = [];

    const config = flowPaths[stage];
    const points = config.points.map(point => new THREE.Vector3(...point));
    flowCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .24);

    pathWaterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColour: { value: new THREE.Color(config.color) },
        uReverse: { value: config.reverse ? -1 : 1 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalView;
        void main() {
          vUv = uv;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColour;
        uniform float uReverse;
        varying vec2 vUv;
        varying vec3 vNormalView;
        void main() {
          float wave = sin(vUv.x * 54.0 - uTime * 5.2 * uReverse) * .5 + .5;
          float streak = smoothstep(.58, 1.0, wave);
          float edge = pow(1.0 - abs(vNormalView.z), 1.6);
          vec3 colour = mix(uColour * .48, vec3(.32, .88, 1.0), streak * .72 + edge * .18);
          float alpha = .40 + streak * .38 + edge * .16;
          gl_FragColor = vec4(colour, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(flowCurve, 110, .017, 10, false),
      pathWaterMaterial
    );
    tube.renderOrder = 4;
    flowGroup.add(tube);

    const particleGeometry = new THREE.SphereGeometry(.0075, 10, 8);
    for (let i = 0; i < 10; i++) {
      const particle = new THREE.Mesh(
        particleGeometry,
        new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: .96,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      particle.userData.offset = i / 10;
      particle.renderOrder = 5;
      flowParticles.push(particle);
      flowGroup.add(particle);
    }
    scene.add(flowGroup);
  }

  function setCameraImmediately(state) {
    cameraNow.target.set(...state.target);
    cameraNow.theta = state.theta;
    cameraNow.phi = state.phi;
    cameraNow.radius = state.radius;
    cameraGoal.target.copy(cameraNow.target);
    cameraGoal.theta = state.theta;
    cameraGoal.phi = state.phi;
    cameraGoal.radius = state.radius;
    applyGuidedCamera();
  }

  function getCameraState(stage) {
    const state = cameraStates[stage];
    if (stage === 3 && host.clientWidth < 650) return { ...state, radius: state.radius * 1.30 };
    return state;
  }

  function applyGuidedCamera() {
    const theta = THREE.MathUtils.degToRad(cameraNow.theta);
    const phi = THREE.MathUtils.degToRad(cameraNow.phi);
    const r = cameraNow.radius;
    camera.position.set(
      cameraNow.target.x + r * Math.sin(phi) * Math.sin(theta),
      cameraNow.target.y + r * Math.cos(phi),
      cameraNow.target.z + r * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(cameraNow.target);
  }

  function setStage(stage) {
    stage = Math.max(0, Math.min(stageNames.length - 1, Number(stage) || 0));
    currentStage = stage;
    const state = getCameraState(stage);
    cameraGoal.target.set(...state.target);
    cameraGoal.theta = state.theta;
    cameraGoal.phi = state.phi;
    cameraGoal.radius = state.radius;

    if (modeLabel) {
      modeLabel.innerHTML = `<span>${stageNames[stage]}</span><small>${stageDetails[stage]}</small>`;
    }
    host.dataset.stage = String(stage);
    host.classList.remove('is-switching');
    void host.offsetWidth;
    host.classList.add('is-switching');

    if (loaded) {
      setExplore(false);
      setFlow(stage);
      setHighlight(stage);
      setPresentationMode(stage);
      if (studioAmbient) studioAmbient.intensity = stage === 3 ? 1.34 : stage === 4 ? .86 : .52;
      if (waterMaterial) waterMaterial.uniforms.uIntensity.value = stage === 1 ? 1.22 : stage === 0 ? 1.06 : .88;
      if (reduceMotion) setCameraImmediately(state);
    }
  }

  function setExplore(value) {
    exploring = Boolean(value && loaded);
    if (controls) {
      controls.enabled = exploring;
      controls.target.copy(cameraNow.target);
      controls.update();
    }
    host.classList.toggle('is-exploring', exploring);
    if (exploreButton) {
      exploreButton.setAttribute('aria-pressed', exploring ? 'true' : 'false');
      exploreButton.textContent = exploring ? 'Return to guided view' : 'Explore 3D';
    }
  }

  function resize() {
    if (!renderer || !camera) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.fov = width < 500 ? 42 : 34;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function animate(now) {
    if (!visible || !renderer || !scene || !camera) {
      raf = 0;
      return;
    }
    const dt = Math.min(.05, Math.max(.001, (now - lastTime) / 1000));
    lastTime = now;

    if (exploring) {
      controls.update();
    } else if (!reduceMotion) {
      const ease = 1 - Math.pow(.0008, dt);
      cameraNow.target.lerp(cameraGoal.target, ease);
      cameraNow.theta = THREE.MathUtils.lerp(cameraNow.theta, cameraGoal.theta, ease);
      cameraNow.phi = THREE.MathUtils.lerp(cameraNow.phi, cameraGoal.phi, ease);
      cameraNow.radius = THREE.MathUtils.lerp(cameraNow.radius, cameraGoal.radius, ease);
      applyGuidedCamera();
    }

    if (flowCurve && flowParticles.length) {
      const backwards = Boolean(flowPaths[currentStage].reverse);
      const speed = reduceMotion ? 0 : now * .000115;
      flowParticles.forEach(particle => {
        let t = (speed + particle.userData.offset) % 1;
        if (backwards) t = 1 - t;
        particle.position.copy(flowCurve.getPointAt(t));
        const pulse = .78 + Math.sin((t + now * .0004) * Math.PI * 2) * .22;
        particle.scale.setScalar(pulse);
      });
    }
    if (waterMaterial) waterMaterial.uniforms.uTime.value = reduceMotion ? 0 : now * .001;
    if (pathWaterMaterial) pathWaterMaterial.uniforms.uTime.value = reduceMotion ? 0 : now * .001;
    if (!reduceMotion) {
      waterLights.forEach((light, index) => {
        light.intensity = 1.25 + Math.sin(now * .0022 + index * 1.8) * .32;
      });
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }

  function startRendering() {
    if (!raf && visible) {
      lastTime = performance.now();
      raf = requestAnimationFrame(animate);
    }
  }

  const visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) {
      if (!renderer) init();
      startRendering();
    }
  }, { rootMargin: '900px 0px 900px' });
  visibilityObserver.observe(host);

  window.addEventListener('rio-stage', event => setStage(event.detail.stage));
  exploreButton?.addEventListener('click', () => setExplore(!exploring));
  setStage(Number(document.getElementById('cp-modules')?.dataset.mode) || 0);
}
