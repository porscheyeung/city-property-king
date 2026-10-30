// 產生 vendor/three.min.js：只匯出 board3d.js 使用的 three.js 元件。
// cd 任一暫存資料夾 && npm i three@0.187.0 && bun build <本檔> --minify --format esm --outfile <專案>/vendor/three.min.js
export {WebGLRenderer,Scene,OrthographicCamera,HemisphereLight,DirectionalLight,Group,Mesh,MeshStandardMaterial,ShadowMaterial,PlaneGeometry,CylinderGeometry,BoxGeometry,ConeGeometry,SphereGeometry,IcosahedronGeometry,TorusGeometry,LatheGeometry,ExtrudeGeometry,Shape,Vector2,Vector3,Raycaster,Plane,Color,Box3,PCFShadowMap,DoubleSide,BufferGeometry,Float32BufferAttribute} from 'three';
export {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
