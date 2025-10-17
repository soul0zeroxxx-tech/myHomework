import * as THREE from 'three'; // three จากที่กำหนดใน importmap
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import { M3D, createLabel2D, FPS } from './utils-module.js';

document.addEventListener("DOMContentLoaded", main);

function main() {
	// ใช้ M3D ที่นำเข้ามา
	document.body.appendChild(M3D.renderer.domElement);
	document.body.appendChild(M3D.cssRenderer.domElement);

	M3D.renderer.setClearColor(0x333333); // กำหนดสีพื้นหลังของ renderer (canvas)
	M3D.renderer.setPixelRatio(window.devicePixelRatio); // ปรับความละเอียดของ renderer ให้เหมาะสมกับหน้าจอ
	M3D.renderer.shadowMap.enabled = true; // เปิดใช้งาน shadow map
	M3D.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // กำหนดประเภทของ shadow map
	M3D.renderer.physicallyCorrectLights = true; // เปิดใช้งานการคำนวณแสงแบบฟิสิกส์
	M3D.renderer.outputEncoding = THREE.sRGBEncoding; // กำหนดการเข้ารหัสสีของ renderer
	M3D.renderer.setAnimationLoop(animate); // ตั้งค่า animation loop

	// Prepaire objects here
	// TODO: วาดฉากทิวทัศน์ 3D ด้วย Three.js
	// ต้องมีครบ 6 อย่าง: ภูเขา, พระอาทิตย์, ท้องนา, ต้นไม้, บ้าน/กระท่อม, แม่น้ำ
	// องค์ประกอบอื่น ๆ เพิ่มเติมได้ตามต้องการ (เช่น ท้องฟ้า, ก้อนเมฆ ฯลฯ)



  // === แสงหลักและแสงเสริม ===
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // แสงอ่อนทั่วฉาก
  M3D.scene.add(ambientLight);

  // แสงดวงอาทิตย์ (จะหมุนไปพร้อมดวง)
  const sunlight = new THREE.DirectionalLight(0xfff8d6, 1.2);
  sunlight.castShadow = true;
  // position the directional light (sun) independently
  sunlight.position.set(50, 80, 30);
  // shadow map resolution (increase for crisper shadows)
  sunlight.shadow.mapSize.width = 2048;
  sunlight.shadow.mapSize.height = 2048;
  // Configure shadow camera (orthographic for directional lights)
  const d = 200;
  sunlight.shadow.camera.left = -d;
  sunlight.shadow.camera.right = d;
  sunlight.shadow.camera.top = d;
  sunlight.shadow.camera.bottom = -d;
  sunlight.shadow.camera.near = 0.5;
  sunlight.shadow.camera.far = 400;
  // reduce shadow acne
  sunlight.shadow.bias = -0.0005;

  // แสงจันทร์ (สีน้ำเงินอ่อน)
  const moonlight = new THREE.DirectionalLight(0x99ccff, 0.5);
  moonlight.castShadow = true;
  moonlight.position.set(-50, 60, -30);
  // smaller shadow area for moon to save perf
  moonlight.shadow.mapSize.width = 1024;
  moonlight.shadow.mapSize.height = 1024;
  const md = 120;
  moonlight.shadow.camera.left = -md;
  moonlight.shadow.camera.right = md;
  moonlight.shadow.camera.top = md;
  moonlight.shadow.camera.bottom = -md;
  moonlight.shadow.camera.near = 0.5;
  moonlight.shadow.camera.far = 300;
  moonlight.shadow.bias = -0.0007;

  M3D.scene.add(sunlight);
  M3D.scene.add(moonlight);

  // === ดวงอาทิตย์ ===
  const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd33, emissive: 0xffcc00 });
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  // sun mesh is purely visual and should not be the parent of the light
  M3D.scene.add(sun);

  // === ดวงจันทร์ ===
  const moonGeometry = new THREE.SphereGeometry(1.5, 32, 32);
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xccccff, emissive: 0x8888ff });
  const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  M3D.scene.add(moon);

  // === จุดหมุนโคจร ===
  const sunPivot = new THREE.Object3D();
  const moonPivot = new THREE.Object3D();
  M3D.scene.add(sunPivot, moonPivot);

  // ตำแหน่งเริ่มต้น (ขึ้นจากขวาบน → ตกซ้ายล่าง)
  sun.position.set(70, 50, -10);   // พระอาทิตย์เริ่มขวาบน
  moon.position.set(-70, -50, 10); // พระจันทร์อยู่ฝั่งตรงข้าม
  sunPivot.add(sun);
  moonPivot.add(moon);

  // === เพิ่มแสงติดดวง ===
  // keep lights in the scene (not parented to the visual sun/moon) so their shadow cameras remain stable
  // place lights near the visual sun/moon
  sunlight.position.copy(sun.position).add(new THREE.Vector3(10, 10, 0));
  moonlight.position.copy(moon.position).add(new THREE.Vector3(-10, 8, 0));



// === วัสดุสองชนิด ===
const matGreen = new THREE.MeshStandardMaterial({
  color: 0x228B22, // เขียวธรรมชาติ
  roughness: 1.0,
});
const matBrown = new THREE.MeshStandardMaterial({
  color: 0x8B4513, // น้ำตาลเข้ม
  roughness: 1.0,
});

// === ขนาดและระยะห่างของแต่ละช่อง ===
const tileSize = 50;
const half = tileSize / 2;

// === พื้นเขียว 3 แผ่น ===
const greenTiles = [
  new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.3, tileSize), matGreen),
  new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.3, tileSize), matGreen),
  new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.3, tileSize), matGreen),
];

// === พื้นน้ำตาล 1 แผ่น ===
const brownTile = new THREE.Mesh(new THREE.BoxGeometry(tileSize, 0.3, tileSize), matBrown);

// === จัดตำแหน่ง ===
// แถวบน
greenTiles[0].position.set(-half, 0, -half); // บนซ้าย
greenTiles[1].position.set(half, 0, -half);  // บนขวา
// แถวล่าง
greenTiles[2].position.set(-half, 0, half);  // ล่างซ้าย
brownTile.position.set(half, 0, half);        // ล่างขวา

// === เพิ่มทั้งหมดลง scene ===
[...greenTiles, brownTile].forEach(tile => {
  tile.receiveShadow = true;
  tile.castShadow = true;
  M3D.scene.add(tile);
});


// === ฟังก์ชันสร้างต้นข้าวแบบง่าย (ตัว V) ===
function createRicePlant() {
  const group = new THREE.Group();

  // ก้านซ้าย
  const left = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1, 3),
    new THREE.MeshStandardMaterial({ color: 0x9ACD32 })
  );
  left.position.y = 0.5;
  left.rotation.z = 0.3;

  // ก้านขวา
  const right = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1, 3),
    new THREE.MeshStandardMaterial({ color: 0x00aa00 })
  );
  right.position.y = 0.5;
  right.rotation.z = -0.3;

  group.add(left);
  group.add(right);

  return group;
}

// === สร้างกลุ่มต้นข้าว ===
const riceField = new THREE.Group();

// กำหนดขอบเขตพื้นที่น้ำตาล (ล่างขวา)
const startX = 25;   // ศูนย์กลางพื้นน้ำตาล x
const startZ = 25;
const areaSize = 50; // ขนาดพื้นที่

// จำนวนต้นข้าว
const count = 1000;

// วางต้นข้าวแบบสุ่มทั่วพื้นที่
for (let i = 0; i < count; i++) {
  const rice = createRicePlant();

  const offsetX = (Math.random() - 0.5) * areaSize;
  const offsetZ = (Math.random() - 0.5) * areaSize;

  rice.position.set(startX + offsetX, 0.15, startZ + offsetZ);
  rice.rotation.y = Math.random() * Math.PI * 2;

  // ensure each child mesh of the rice plant casts and receives shadows
  rice.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  riceField.add(rice);
}

M3D.scene.add(riceField);


// === ภูเขาทรงกรวยคว่ำปลายมน ===
const mountainGeometry = new THREE.CylinderGeometry(
  0,      // radiusTop (ยอด)
  25,     // radiusBottom (ฐาน)
  30,     // height
  32      // segments
);

// เพิ่มความมนที่ยอด (ไม่ให้แหลม)
const mountainTopRadius = 4; // รัศมีเล็กน้อยบนยอด
const smoothMountain = new THREE.CylinderGeometry(mountainTopRadius, 25, 40, 32);

// วัสดุภูเขา - เขียวปนเทา (เหมือนหญ้าปนหิน)
const mountainMaterial = new THREE.MeshStandardMaterial({
  color: 0x556B2F,  // OliveDrab เขียวหม่นธรรมชาติ
  roughness: 1.0,
});

// สร้าง mesh
const mountain = new THREE.Mesh(smoothMountain, mountainMaterial);
mountain.castShadow = true;
mountain.receiveShadow = true;

// หมุนกลับด้าน (ให้ฐานอยู่ล่าง)
mountain.rotation.x = 0;
mountain.position.set(40, 20, -50); // อยู่ด้านขวาของฉาก บนพื้นเขียว
M3D.scene.add(mountain);

// === ภูเขาลูกที่สอง (อยู่ซ้ายและไล่ระดับ) ===
const mountain2Geometry = new THREE.CylinderGeometry(
  5,   // radiusTop (ยอดกว้างกว่านิด)
  20,  // radiusBottom (ฐานเล็กกว่า)
  25,  // height (เตี้ยกว่าเล็กน้อย)
  32
);

const mountain2Material = new THREE.MeshStandardMaterial({
  color: 0x667744,  // สีเขียวอ่อนกว่าลูกแรก (ดูอยู่ถัดไป)
  roughness: 1.0,
});

const mountain2 = new THREE.Mesh(mountain2Geometry, mountain2Material);
mountain2.castShadow = true;
mountain2.receiveShadow = true;

// ตั้งตำแหน่ง — ซ้ายมาหน่อย และลึกไปข้างหลังเล็กน้อย
mountain2.position.set(25, 10, -55); // x ซ้ายกว่า, y ต่ำกว่า, z ลึกกว่า

M3D.scene.add(mountain2);



// === ฟังก์ชันสร้างบ้านทรงจั่ว ===
function createHouse(colorWall = 0x8B4513, colorRoof = 0x3A2A0A) {
  const house = new THREE.Group();

  // ตัวบ้าน (ทรงกล่อง)
  const bodyGeometry = new THREE.BoxGeometry(8, 6, 6);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: colorWall });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 3;
  body.castShadow = true;
  body.receiveShadow = true;
  house.add(body);

  // หลังคา (ทรงสามเหลี่ยมจั่ว)
  const roofGeometry = new THREE.ConeGeometry(7, 6, 4); // base radius, height, faces
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: colorRoof,
    roughness: 1.0,
  });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 8;
  roof.rotation.y = Math.PI / 4; // หมุนให้ตรงแนวกล่อง
  roof.castShadow = true;
  roof.receiveShadow = true;
  house.add(roof);

  return house;
}

// === สร้างบ้าน 3 หลัง ===
const house1 = createHouse();
house1.position.set(-15, 0, -25); // บ้านซ้าย

const house2 = createHouse(0xA0522D, 0x4B2E05); // สีต่างเล็กน้อย
house2.position.set(0, 0, -28);   // บ้านกลาง

const house3 = createHouse(0x8B4513, 0x2F1E08);
house3.position.set(15, 0, -25);  // บ้านขวา

M3D.scene.add(house1);
M3D.scene.add(house2);
M3D.scene.add(house3);

// === ฟังก์ชันสร้างต้นไม้ ===
function createTree(
  trunkColor = 0x8B5A2B,   // สีน้ำตาลลำต้น
  leafColor = 0x2E8B57,    // สีเขียวพุ่ม
  height = 8,
  radius = 3
) {
  const tree = new THREE.Group();

  // ลำต้น
  const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, height / 2, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: trunkColor });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = height / 4;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  // พุ่มใบ (ทรงกลม)
  const leavesGeometry = new THREE.SphereGeometry(radius, 16, 16);
  const leavesMaterial = new THREE.MeshStandardMaterial({ color: leafColor });
  const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
  leaves.position.y = height * 0.75;
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  tree.add(leaves);

  return tree;
}

// === เพิ่มต้นไม้หลายต้นรอบบ้าน ===
const trees = [];

function addTree(x, z, scale = 1) {
  const t = createTree();
  t.position.set(x, 0, z);
  t.scale.set(scale, scale, scale);
  M3D.scene.add(t);
  trees.push(t);
}

// กระจายต้นไม้รอบ ๆ บ้าน
addTree(-25, -20, 1.2);
addTree(-10, -22, 1);
addTree(10, -20, 1.3);
addTree(25, -18, 1.1);
addTree(0, -35, 1.4);
addTree(20, -40, 1.2);
addTree(-20, -38, 1);




// === ฟังก์ชันสร้างแม่น้ำแบบแผ่นโค้งติดพื้น ===
function createRiver() {
  const riverGroup = new THREE.Group();

  const curvePoints = [
    new THREE.Vector3(-30, 0.15, 50),
    new THREE.Vector3(-40, 0.15, 25),
    new THREE.Vector3(-45, 0.15, 10),
    new THREE.Vector3(-40, 0.15, -5),
    new THREE.Vector3(-30, 0.15, -20),
    new THREE.Vector3(-30, 0.15, -35),
    new THREE.Vector3(-20, 0.15, -50),
  ];

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const segments = 80;
  const riverWidth = 6;

  const riverMaterial = new THREE.MeshStandardMaterial({
    color: 0x3399ff,
    roughness: 0.15,
    metalness: 0.6,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });

  const points = curve.getPoints(segments);
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    const angle = Math.atan2(dz, dx);
    const dist = Math.sqrt(dx * dx + dz * dz);

    const segmentGeometry = new THREE.PlaneGeometry(dist, riverWidth);
    const segment = new THREE.Mesh(segmentGeometry, riverMaterial);

    // ✅ หมุนให้ราบกับพื้น
    segment.rotation.x = -Math.PI / 2; // วางแนวนอน
    segment.rotation.z = angle;        // หมุนตามโค้ง (ใช้แกน z แทน y)

    // ✅ จัดตำแหน่งให้อยู่ตรงกลางระหว่างสองจุด
    segment.position.set((p1.x + p2.x) / 2, p1.y, (p1.z + p2.z) / 2);
segment.position.y = p1.y + 0.1; // ยกขึ้นนิดหน่อย

  // set shadow flags on the river segment
  segment.castShadow = false; // usually water shouldn't cast strong shadows
  segment.receiveShadow = true;

  riverGroup.add(segment);
  }

  return riverGroup;
}

// === เพิ่มแม่น้ำลงในฉาก ===
const river = createRiver();
M3D.scene.add(river);






	
	// Stats
	const stats = new Stats(); // สร้าง Stats เพื่อตรวจสอบประสิทธิภาพ
	document.body.appendChild(stats.dom); // เพิ่ม Stats ลงใน body ของ HTML

	// GUI
	const gui = new GUI(); // สร้าง GUI สำหรับปรับแต่งค่าต่างๆ 


	function animate() {
		M3D.controls.update(); // อัปเดต controls
		stats.update(); // อัปเดต Stats
		FPS.update(); // อัปเดต FPS

		// UPDATE state of objects here
		// TODO: อัปเดตสถานะของวัตถุต่างๆ ที่ต้องการในแต่ละเฟรม (เช่น การเคลื่อนที่, การหมุน ฯลฯ)
// หมุนขึ้น-ลง (แนวตั้ง) จากตะวันออกไปตะวันตก
const rotationSpeed = 0.002;

// พระอาทิตย์หมุนจากทิศตะวันออกขึ้นเหนือแล้วตกตะวันตก
sunPivot.rotation.z += rotationSpeed;

// พระจันทร์หมุนในทิศตรงข้าม (จากตะวันตกขึ้นเหนือแล้วลงทางตะวันออก)
moonPivot.rotation.z += rotationSpeed;

		// RENDER scene and camera
		M3D.renderer.render(M3D.scene, M3D.camera); // เรนเดอร์ฉาก
		M3D.cssRenderer.render(M3D.scene, M3D.camera); // เรนเดอร์ CSS2DRenderer
		console.log(`FPS: ${FPS.fps}`); // แสดงค่า FPS ในคอนโซล
	}
}