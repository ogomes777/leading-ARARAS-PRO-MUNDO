(() => {
  const vertex = `
    attribute vec3 aPoint, aNormal, aColor;
    uniform mat4 uView, uModel, uWing;
    uniform float uTime,uPlant;
    varying vec3 vNormal, vColor, vWorld;
    varying float vDistance;
    void main() {
      vec3 sway=aPoint;
      sway.x+=uPlant*.12*sin(uTime*1.6+aPoint.z*.7+aPoint.y);
      sway.y+=uPlant*.055*cos(uTime*1.8+aPoint.x*2.);
      vec4 point = uModel * uWing * vec4(sway, 1.);
      gl_Position = uView * point;
      vWorld = point.xyz;
      vNormal = mat3(uModel) * mat3(uWing) * aNormal;
      vColor = aColor;
      vDistance = gl_Position.w;
    }`;
  const fragment = `
    precision mediump float;
    varying vec3 vNormal, vColor, vWorld;
    varying float vDistance;
    uniform vec3 uEye;
    uniform float uBird, uShine, uWood;
    float grain(vec3 p) {
      return sin(p.x * 43. + sin(p.y * 31.) + p.z * 71.) * sin(p.x * 81. - p.y * 64. + p.z * 35.);
    }
    void main() {
      vec3 view = normalize(uEye - vWorld);
      vec3 n = normalize(vNormal);
      if (dot(n, view) < 0.) n = -n;
      vec3 sun = normalize(vec3(.35, .48, 1.));
      float frontLight = max(0., dot(n, sun));
      float rim = pow(1. - abs(dot(n, view)), 3.) * max(0., dot(n, sun));
      float sheen = pow(max(dot(n, normalize(sun + view)), 0.), 17.);
      vec3 warm = vec3(1., .78, .45);
      vec3 light = mix(vec3(.72, .76, .52), vec3(.83, .92, 1.), uBird);
      float rings=sin(vWorld.z*42.+sin(vWorld.y*11.)*2.5+sin(vWorld.x*9.)*1.7);
      float fibers=sin(vWorld.z*180.+vWorld.x*39.)*.07;
      float texture = 1. + (rings*.15+fibers+grain(vWorld)*.08)*uWood;
      n=normalize(n+vec3(rings*.11,fibers*.8,0.)*uWood);
      vec3 lit = vColor * (light + frontLight * warm * .92) * texture
        + warm * (rim * mix(.38, .12, uBird) + sheen * uShine);
      float fog = smoothstep(24., 155., vDistance) * .90 * (1. - uBird);
      vec3 horizon = mix(vec3(.83, .69, .50), vec3(.73, .78, .81), smoothstep(-3., 6., vWorld.y));
      vec3 color = mix(lit, horizon, fog);
      float cloud = 1. - smoothstep(-4.35, -2.85, vWorld.y + .38 * sin(vWorld.x*2. + vWorld.z*.6));
      color = mix(color, vec3(.70,.67,.62), cloud * .18 * (1.-uBird));
      gl_FragColor = vec4(color, 1.);
    }`;
  const skyVertex = `
    attribute vec2 aPoint;
    varying vec2 vScreen;
    void main() { vScreen = aPoint; gl_Position = vec4(aPoint, 0., 1.); }`;
  const skyFragment = `
    precision highp float;
    varying vec2 vScreen;
    uniform vec3 uEye;
    uniform float uAspect, uFov, uTime;
    float hash(vec2 p) {
      vec3 q = fract(vec3(p.xyx) * .1031);
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.-2.*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+1.), u.x), u.y);
    }
    float fbm(vec2 p) {
      return noise(p)*.49 + noise(p*2.04)*.25 + noise(p*4.17)*.14 + noise(p*8.29)*.08 + noise(p*16.31)*.04;
    }
    float noise3(vec3 p) {
      vec3 i=floor(p),f=fract(p);
      f=f*f*(3.-2.*f);
      vec2 a=i.xy+vec2(37.,19.)*i.z;
      return mix(
        mix(mix(hash(a),hash(a+vec2(1.,0.)),f.x),mix(hash(a+vec2(0.,1.)),hash(a+1.),f.x),f.y),
        mix(mix(hash(a+vec2(37.,19.)),hash(a+vec2(38.,19.)),f.x),mix(hash(a+vec2(37.,20.)),hash(a+vec2(38.,20.)),f.x),f.y),
        f.z);
    }
    float cloudShape(vec3 p) {
      vec3 q=p*vec3(.16,.38,.16)+vec3(uTime*.10,0.,0.);
      float mass=noise3(q)*.56+noise3(q*2.03)*.27+noise3(q*4.1)*.12+noise3(q*8.3)*.05;
      float height=smoothstep(-6.5,-4.9,p.y)*(1.-smoothstep(-3.7,-1.4,p.y));
      return smoothstep(.43,.66,mass)*height;
    }
    void main() {
      vec2 p = vec2(vScreen.x*uAspect, vScreen.y);
      vec3 ray = normalize(vec3(p*uFov - vec2(-uEye.x * .026, -.10), 1.));
      float d = length(ray.xy);
      float above = smoothstep(-.06, .34, ray.y);
      vec3 sky = mix(vec3(.91, .57, .35), vec3(.16, .36, .59), above);
      sky = mix(sky, vec3(1., .75, .42), exp(-d * 4.1) * .86);
      if (ray.y < -.018) {
        float begin = (-2.1 - uEye.y) / ray.y;
        float end = (-6.5 - uEye.y) / ray.y;
        float stride = (end-begin) / 28.;
        vec4 cloud = vec4(0.);
        for (int i = 0; i < 28; i++) {
          float jitter=hash(gl_FragCoord.xy)*.65;
          float t = begin + (float(i) + .2+jitter)*stride;
          vec3 pos = uEye + ray*t;
          float density = cloudShape(pos);
          if (density > .01) {
            float shade = clamp((density - cloudShape(pos + vec3(.22,.63,.48))) * 2.35, 0., 1.);
            vec3 dark = mix(vec3(.39,.44,.56),vec3(.68,.47,.42),exp(-d*2.5));
            vec3 light = mix(vec3(.96,.93,.86),vec3(1.,.87,.65),exp(-d*2.4));
            float alpha = (1.-cloud.a)*clamp(density * .36,0., 1.);
            cloud += vec4(mix(dark, light, shade) * alpha, alpha);
          }
          if (cloud.a > .982) break;
        }
        float distanceFade = 1. - smoothstep(40.,128.,begin);
        sky = mix(sky, cloud.rgb + sky*(1.-cloud.a), distanceFade);
      }
      float forest = smoothstep(125.,155.,uEye.z);
      if (ray.y < -.035) {
        float groundDistance = (-17.-uEye.y)/ray.y;
        vec3 ground = uEye + ray*groundDistance;
        float canopy = fbm(ground.xz*.12);
        float clusters = fbm(ground.xz*.36);
        vec3 trees = mix(vec3(.07,.17,.10),vec3(.28,.40,.14),canopy);
        trees += vec3(.16,.15,.045)*pow(clusters,3.);
        float haze = smoothstep(70.,380.,groundDistance);
        trees = mix(trees,vec3(.65,.69,.60),haze*.82);
        sky = mix(sky,trees,forest*(1.-smoothstep(-.14,-.035,ray.y)));
      }
      sky += vec3(1., .52, .11) * exp(-d * 16.) * .61;
      sky = mix(sky, vec3(1., .96, .81), 1. - smoothstep(.012, .026, d));
      gl_FragColor = vec4(sky, 1.);
    }`;

  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const scale = (a, k) => a.map(v => v * k);
  const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
  const unit = v => scale(v, 1 / (Math.hypot(...v) || 1));
  const blend = (a, b, k) => a + (b - a) * k;
  const ease = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  const identity = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  const angleZ = (a, x = 0, y = 0, z = 0) => {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, x,y,z,1]);
  };
  const birdPose = (roll, tilt, yaw, x, y, z) => {
    const c = Math.cos(roll), s = Math.sin(roll), d = Math.cos(tilt), t = Math.sin(tilt);
    const a = Math.cos(yaw), b = Math.sin(yaw);
    return new Float32Array([
      a*c,s,-b*c,0,
      -a*s*d+b*t,c*d,b*s*d+a*t,0,
      a*s*t+b*d,-c*t,-b*s*t+a*d,0,
      x,y,z,1
    ]);
  };

  function triangle(mesh, a, b, c, color, normals) {
    const face = normals || Array(3).fill(unit(cross(sub(b, a), sub(c, a))));
    [a, b, c].forEach((p, i) => mesh.push(...p, ...face[i], ...color));
  }

  function tube(mesh, points, radius, color, sides = 6) {
    const rings = points.map((p, i) => {
      const axis = unit(sub(points[Math.min(i+1, points.length-1)], points[Math.max(0, i-1)]));
      const normal = unit(cross(axis, Math.abs(axis[2]) > .78 ? [0,1,0] : [0,0,1]));
      const binormal = cross(axis, normal);
      const r = typeof radius === 'function' ? radius(i / (points.length-1)) : radius;
      return Array.from({length: sides}, (_, j) => {
        const a = j * Math.PI * 2 / sides;
        return add(p, add(scale(normal, Math.cos(a)*r), scale(binormal, Math.sin(a)*r)));
      });
    });
    for (let i = 1; i < rings.length; i++) {
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        const bark = scale(color, .76 + .24 * Math.cos(j * 1.8 + i * .37) ** 2);
        triangle(mesh, rings[i-1][k], rings[i-1][j], rings[i][j], bark);
        triangle(mesh, rings[i-1][k], rings[i][j], rings[i][k], bark);
      }
    }
  }

  function oval(mesh, center, size, color, rows = 7, slices = 12, yaw = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const turn = p => [p[0]*c + p[2]*s, p[1], p[2]*c - p[0]*s];
    const point = (i, j) => {
      const lat = Math.PI*i/rows, lon = Math.PI*2*j/slices;
      const v = [Math.sin(lat)*Math.cos(lon), Math.cos(lat), Math.sin(lat)*Math.sin(lon)];
      return [add(center, turn(v.map((n, k) => n*size[k]))), unit(turn(v.map((n, k) => n/size[k])))];
    };
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < slices; j++) {
        const a = point(i,j), b = point(i,j+1), c = point(i+1,j), d = point(i+1,j+1);
        if (i > 0) triangle(mesh, a[0], c[0], b[0], color, [a[1], c[1], b[1]]);
        if (i < rows-1) triangle(mesh, b[0], c[0], d[0], color, [b[1], c[1], d[1]]);
      }
    }
  }

  const leafEdge = [
    [0,.72],[.16,.41],[.29,.49],[.24,.26],[.52,.32],[.43,.14],[.66,.07],[.44,-.02],
    [.58,-.21],[.32,-.2],[.28,-.4],[.12,-.27],[0,-.39],[-.12,-.27],[-.28,-.4],
    [-.32,-.2],[-.58,-.21],[-.44,-.02],[-.66,.07],[-.43,.14],[-.52,.32],[-.24,.26],[-.29,.49],[-.16,.41]
  ];

  function leaf(mesh, center, size, angle, tilt, color) {
    const u = [Math.cos(angle), Math.sin(angle), 0];
    const v = [-Math.sin(angle)*Math.cos(tilt), Math.cos(angle)*Math.cos(tilt), Math.sin(tilt)];
    const n = cross(u, v);
    const tip = (x,y) => add(center, add(scale(u, x*size), scale(v, y*size)));
    const raised = add(center, scale(n, size*.15));
    leafEdge.forEach(([x,y], i) => {
      const [a,b] = leafEdge[(i+1) % leafEdge.length];
      triangle(mesh, raised, tip(x,y), tip(a,b), scale(color, .76 + .24 * Math.sin(i*.64)**2));
    });
    const vein = scale(color, 1.4);
    for (const [x,y] of [[0,.62],[.47,.12],[-.47,.12],[.34,-.15],[-.34,-.15]]) {
      const end = tip(x,y);
      triangle(mesh, add(raised, scale(u, size*.014)), add(raised, scale(n, size*.016)), add(end, scale(n, size*.02)), vein);
    }
  }

  function buildTunnel() {
    const sections = [];
    let wood, leaves, grapes;
    let seed = 777;
    const rnd = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
    const between = (a,b) => blend(a,b,rnd());
    const palette = [[.35,.42,.062],[.44,.49,.071],[.26,.35,.069],[.73,.58,.082],[.52,.47,.063],[.19,.28,.049]];
    const pitch = 5.9;
    const arch = (a, z, offset = 0) => {
      const r = 4.72 + offset + .1 * Math.cos(a*4 + z*.14);
      return [Math.cos(a)*r, Math.sin(a)*r + .46, z];
    };
    for (let archIndex = 0; archIndex < 23; archIndex++) {
      const z = 4.5 + archIndex * pitch;
      if (archIndex % 3 === 0) {
        wood = [];
        leaves = [];
        grapes = [];
        sections.push({z, meshes: {wood, leaves, grapes}});
      }
      const bend = between(-.7,.7);
      for (let strand = 0; strand < 10; strand++) {
        const offset = between(-.24,.26), phase = between(0,6.2);
        const points = Array.from({length:49}, (_, i) => {
          const a = -1.015 + i*.1078;
          const coil = a*7.7 + phase;
          return arch(a, z + Math.sin(coil)*.28 + Math.cos(a*2)*bend + offset, offset + Math.cos(coil)*.23);
        });
        const radius = strand < 3 ? between(.11,.17) : between(.027,.084);
        tube(wood, points, t => radius*(.85 + .15*Math.sin(t*33+phase)), [.29,.145,.066]);
      }
      for (let j = 0; j < 157; j++) {
        const a = between(-.83,4.04);
        const point = arch(a, z + between(-1.08,1.2), between(-.75,.72));
        leaf(leaves, point, between(.26,.99), between(-3.14,3.14), between(-1.35,1.35), palette[Math.floor(rnd()*palette.length)]);
        if (j % 16 === 0) {
          const stem = arch(a, z, -.32);
          const tip = add(point, [between(-.38,.38), between(-.61,-.21), between(-.27,.3)]);
          tube(wood, [stem, point, tip], t => .04 - .027*t, [.35,.25,.066], 5);
        }
      }
      for (let j = 0; j < 12; j++) {
        const a = -.32 + j*.341 + between(-.1,.1);
        const p = arch(a, z + between(-.54,.46), between(-.35,-.18));
        const stem = add(p, [0,-.29,.025]);
        tube(wood, [p, stem], .028, [.34,.28,.083], 5);
        const tint = between(.75,1.23);
        for (let row = 0; row < 5; row++) {
          const count = 6-row;
          for (let k = 0; k < count; k++) {
            const angle = k*2*Math.PI/count + row*1.07;
            const spread = .20 - .032*row;
            const berry = add(stem, [Math.cos(angle)*spread, -row*.145, Math.sin(angle)*spread]);
            const r = between(.085,.122);
            oval(grapes, berry, [r,r*1.1,r], scale([.28,.069,.126], tint * between(.7,1.26)), 4, 6);
          }
        }
      }
      if (archIndex < 22) {
        for (const a of [-.29,.16,.6,1.21,1.87,2.57,3.04,3.41]) {
          const phase = between(0,6.2);
          const stem = Array.from({length:12}, (_, i) => arch(a + .12*Math.sin(i*.58+phase), z+i*pitch/11, .12*Math.sin(i*.8)));
          tube(wood, stem, .028, [.22,.14,.051], 5);
          for (let j = 1; j < 11; j += 2) {
            leaf(leaves, add(stem[j], [between(-.3,.3),between(-.3,.1),0]), between(.26,.56), between(-3,3), between(-1,1), palette[Math.floor(rnd()*palette.length)]);
          }
        }
      }
    }
    return sections;
  }

  function feather(mesh, base, tip, width, color) {
    const axis = sub(tip, base);
    const side = scale(unit(cross(axis, [0,1,0])), width);
    const mid = add(base, scale(axis, .55));
    const leading = add(mid, side), trailing = sub(mid, scale(side, .7));
    const ridge = add(mid,[0,.043,0]);
    triangle(mesh, base, leading, ridge, scale(color, 1.13));
    triangle(mesh, leading, tip, ridge, scale(color, 1.03));
    triangle(mesh, base, ridge, trailing, scale(color, .85));
    triangle(mesh, trailing, ridge, tip, scale(color, .75));
  }

  function buildForest() {
    const mesh=[];
    let seed=1777;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(let index=0;index<235;index++){
      const z=138+random()*250;
      const x=(random()-.5)*160;
      const top=-10-random()*6;
      const radius=2.2+random()*3.7;
      tube(mesh,[[x,-24,z],[x+.4,top-1,z]],.19,[.18,.12,.067],5);
      for(let cluster=0;cluster<4;cluster++){
        const angle=cluster*Math.PI*.5+index;
        const color=[.08+random()*.09,.21+random()*.15,.065+random()*.045];
        oval(mesh,[x+Math.cos(angle)*radius*.48,top+random()*1.1,z+Math.sin(angle)*radius*.48],
          [radius*.82,radius*.58,radius*.82],color,7,10);
      }
    }
    return mesh;
  }

  function buildMacaw() {
    const body = [], left = [], right = [];
    const blue = [.047,.245,.57];
    const cobalt = [.035,.30,.69];
    const navy = [.025,.093,.28];
    const yellow = [.96,.64,.087];
    oval(body, [0,0,0], [.21,.205,.54], blue,12,20);
    oval(body, [0,-.10,.17], [.17,.15,.37], yellow,10,18);
    oval(body, [0,.085,.36], [.169,.188,.235], cobalt,12,20);
    oval(body, [0,.013,.54], [.118,.133,.135], [.085,.08,.092]);
    oval(body, [0,-.051,.594], [.083,.092,.089], [.044,.044,.062]);
    for (const s of [-1,1]) {
      oval(body, [s*.088,.004,.494], [.053,.056,.106], yellow);
      oval(body, [s*.147,.133,.431], [.032,.046,.052], yellow, 6, 9);
      oval(body, [s*.165,.139,.444], [.02,.033,.034], [.032,.022,.022], 6, 9);
      oval(body, [s*.18,.150,.453], [.009,.011,.01], [.94,.91,.74], 4, 6);
      oval(body, [s*.096,-.145,-.19], [.06,.055,.12], [.067,.068,.084], 5, 8);
    }
    for (let j = -3; j <= 3; j++) {
      feather(body, [j*.029,-.064,-.35], [j*.065,-.19,-1.43+Math.abs(j)*.11], .068, scale([.05,.37,.29], .94 + j*.038));
    }
    for (const s of [-1,1]) {
      const wing = s < 0 ? left : right;
      oval(wing,[s*.45,.016,-.015],[.51,.083,.265], cobalt, 6, 12, s*.19);
      for (let j = 0; j < 10; j++) {
        const x = .22 + j*.111;
        const extension = .21 + .59*(j/9)**2;
        feather(wing, [s*x,.04,.13-j*.006], [s*(x+extension),-.095,-.69+j*.058], .10, scale(blue, 1.07+j*.028));
        feather(wing, [s*x,.015,-.08], [s*(x+extension*.95),-.15,-.80+j*.053], .088, scale(navy, .8+j*.071));
        if (j < 8) feather(wing, [s*(x-.035),.081,.157], [s*(x+.12),.032,-.29], .073, scale(cobalt, .95+j*.035));
      }
    }
    return {body,left,right};
  }

  function program(gl, vert, frag, attributes, uniforms) {
    const linked = gl.createProgram();
    for (const [kind, source] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]) {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(linked,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(linked);
    if (!gl.getProgramParameter(linked,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(linked));
    const locations = {};
    for (const a of attributes) locations[a] = gl.getAttribLocation(linked,a);
    for (const u of uniforms) locations[u] = gl.getUniformLocation(linked,u);
    return {linked,...locations};
  }

  function viewProjection(x, y, z, f, aspect) {
    // Camera faces positive Z. Small screen offsets keep the horizon in the video composition.
    const a = 1.0014, b = -.1701, dx = -.026*x*f, dy = -.10*f;
    return new Float32Array([
      f/aspect,0,0,0, 0,f,0,0, dx,dy,a,1,
      -x*f/aspect-dx*z,-y*f-dy*z,b-a*z,-z
    ]);
  }

  window.createVineFlight = canvas => {
    const gl = canvas.getContext('webgl', {alpha:false, antialias:true, powerPreference:'high-performance'});
    if (!gl) return null;
    const sky = program(gl,skyVertex,skyFragment,['aPoint'],['uEye','uAspect','uFov','uTime']);
    const world = program(gl,vertex,fragment,['aPoint','aNormal','aColor'],['uView','uModel','uWing','uEye','uBird','uShine','uWood','uTime','uPlant']);
    const buffer = (mesh, step) => {
      const id = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,id);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh),gl.STATIC_DRAW);
      return {id,count:mesh.length/step};
    };
    const skyMesh = buffer([-1,-1, 3,-1, -1,3],2);
    const birdGeometry = buildMacaw();
    const tunnel = buildTunnel().map(({z,meshes}) => ({
      z, meshes: Object.entries(meshes).map(([name,mesh]) => [name,buffer(mesh,9)])
    }));
    const bird = Object.fromEntries(Object.entries(birdGeometry).map(([name,mesh]) => [name,buffer(mesh,9)]));
    const forest=buffer(buildForest(),9);
    const pivot = (s, a) => angleZ(a,s*.16*(1-Math.cos(a)),-s*.16*Math.sin(a),0);
    const draw = ({id,count}) => {
      gl.bindBuffer(gl.ARRAY_BUFFER,id);
      [world.aPoint,world.aNormal,world.aColor].forEach((a,i) => {
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a,3,gl.FLOAT,false,36,12*i);
      });
      gl.drawArrays(gl.TRIANGLES,0,count);
    };
    let w, h;
    return function render(progress, elapsed, reduced) {
      if (gl.isContextLost()) return;
      const ratio = Math.min(devicePixelRatio, 1.4, 1750 / Math.max(1,canvas.clientWidth));
      const width = Math.round(canvas.clientWidth * ratio), height = Math.round(canvas.clientHeight * ratio);
      if (!width || !height) return;
      if (w !== width || h !== height) {
        canvas.width = w = width;
        canvas.height = h = height;
        gl.viewport(0,0,w,h);
      }
      const p = progress/100;
      const t = reduced ? 3 : elapsed;
      const x = reduced ? 0 : .24*Math.sin(p*9) + .035*Math.sin(t*1.6);
      const y = reduced ? 0 : .14*Math.sin(p*8) + .035*Math.sin(t*1.18);
      const z = p*224;
      const aspect = w/h, focal = aspect < 1 ? 1.48 : 1.69;
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(sky.linked);
      gl.bindBuffer(gl.ARRAY_BUFFER,skyMesh.id);
      gl.enableVertexAttribArray(sky.aPoint);
      gl.vertexAttribPointer(sky.aPoint,2,gl.FLOAT,false,0,0);
      gl.uniform3f(sky.uEye,x,y,z);
      gl.uniform1f(sky.uAspect,aspect);
      gl.uniform1f(sky.uFov,1/focal);
      gl.uniform1f(sky.uTime,t);
      gl.drawArrays(gl.TRIANGLES,0,skyMesh.count);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(world.linked);
      gl.uniformMatrix4fv(world.uView,false,viewProjection(x,y,z,focal,aspect));
      gl.uniform3f(world.uEye,x,y,z);
      gl.uniformMatrix4fv(world.uModel,false,identity);
      gl.uniformMatrix4fv(world.uWing,false,identity);
      gl.uniform1f(world.uBird,0);
      gl.uniform1f(world.uTime,t);
      gl.uniform1f(world.uPlant,0);
      for (const section of tunnel) {
        if (section.z < z - 19 || section.z > z + 89) continue;
        for (const [name,mesh] of section.meshes) {
          gl.uniform1f(world.uShine,name === 'grapes' ? .33 : .023);
          gl.uniform1f(world.uWood,Number(name === 'wood'));
          gl.uniform1f(world.uPlant,Number(name === 'leaves'));
          draw(mesh);
        }
      }
      gl.uniform1f(world.uPlant,0);
      if(z>70){
        gl.uniform1f(world.uWood,0);
        gl.uniform1f(world.uShine,.025);
        draw(forest);
      }
      const entrance = ease((t-.25)/2.5);
      const settled = ease((t-2.2)/1.45);
      const sx = (aspect < 1 ? -3.4 : -5.9) * (1-entrance) + Math.sin(t*1.3+p*7)*.36*settled + .63*Math.sin(entrance*Math.PI);
      const sy = blend(-.69,.93,entrance) + .13*Math.sin(t*3.4)*settled;
      const sz = blend(2.85,7.4,entrance) + (aspect < 1 ? 2.1 : .9)*settled;
      const roll = reduced ? 0 : -.32*Math.sin(entrance*Math.PI) + .10*Math.sin(t*1.7+p*9)*settled;
      const flap = reduced ? .12 : (Math.sin(t*6.1 + .45)*.44+Math.sin(t*12.2)*.075)*(1.-.35*settled);
      gl.uniform1f(world.uBird,1);
      gl.uniform1f(world.uShine,.10);
      gl.uniform1f(world.uWood,0);
      const yaw = reduced ? 0 : .99*(1-entrance) + .09*Math.sin(t*1.3+p*7)*settled;
      gl.uniformMatrix4fv(world.uModel,false,birdPose(roll,-.14-.18*(1-entrance),yaw,sx,sy,sz+z));
      draw(bird.body);
      gl.uniformMatrix4fv(world.uWing,false,pivot(-1,-flap));
      draw(bird.left);
      gl.uniformMatrix4fv(world.uWing,false,pivot(1,flap));
      draw(bird.right);
    };
  };
})();
