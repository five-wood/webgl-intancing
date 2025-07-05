
class InstanceRenderer {
    //#region 子类复写
    _initByType(){}
    _createVShadersByType(){ return ""}
    _updateInstanceByType(){}
    _renderByType(){}
    //#endregion

    constructor(canvas, method) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2');
        this.method = method;
        this.instanceCount = 10000;
        this.instances = [];
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.updateTime = 0;
        this.uploadTime = 0;
        this.renderTime = 0;
        this.isActive = false;
        this.MAX_INS_COUNT_PER = 1024;
        
        if (!this.gl) {
            throw new Error('WebGL 2.0 not supported');
        }
        
        this.init();
    }
    
    init() {
        const gl = this.gl;
        
        // 初始化实例数据
        for (let i = 0; i < this.instanceCount; i++) {
            this.instances.push({
                position: [
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    0
                ],
                color: [
                    Math.random(),
                    Math.random(),
                    Math.random(),
                    1.0
                ],
                scale: 0.02 + Math.random() * 0.03,
                rotation: Math.random() * Math.PI * 2
            });
        }
        
        // 创建着色器
        this.createShaders();
        
        // 创建几何体
        this.createGeometry();
        
        this._initByType();
        
        // 设置WebGL状态
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.enable(gl.DEPTH_TEST);
    }

  
    createShaders() {
        const gl = this.gl;
        
        let vertexShaderSource, fragmentShaderSource;
        
        // 基础片段着色器（所有方法共用）
        fragmentShaderSource = `#version 300 es
        precision highp float;
        
        in vec4 v_color;
        out vec4 fragColor;
        
        void main() {
            fragColor = v_color;
        }`;
        
        vertexShaderSource = this._createVShadersByType()
        
        // 编译着色器
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // 创建程序
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('Program link failed: ' + gl.getProgramInfoLog(this.program));
        }
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
        }
        
        return shader;
    }
    
    createGeometry() {
        const gl = this.gl;
        
        // 创建一个简单的三角形
        const vertices = new Float32Array([
            0.0, 0.5,
            -0.5, -0.5,
            0.5, -0.5
        ]);
        
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        
        // 顶点缓冲
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const positionLoc = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindVertexArray(null);
    }

    updateInstances(time) {
        if (!this.isActive) return;
        const uploadStart = performance.now();
        this._updateInstanceByType()
        this.uploadTime = performance.now() - uploadStart;
    }

    render(time) {
        if (!this.isActive) return;
        
        const renderStart = performance.now();
        
        const gl = this.gl;
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
        
        this._renderByType()
        
        this.renderTime = performance.now() - renderStart;
    }
    
    animate(time) {
        if (!this.isActive) {
            requestAnimationFrame((t) => this.animate(t));
            return;
        }
        this.updatePosAndRotation(time)

        this.updateInstances(time);
        this.render(time);
        
        // 计算FPS
        this.frameCount++;
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= 1000) {
            this.fps = (this.frameCount * 1000) / deltaTime;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
        requestAnimationFrame((t) => this.animate(t));
    }

    updatePosAndRotation(time)
    {
        const updateStart = performance.now();
        // 更新实例数据
        for (let i = 0; i < this.instanceCount; i++) {
            const instance = this.instances[i];
            instance.rotation += 0.01;
            instance.position[0] = Math.sin(time * 0.001 + i * 0.1) * 0.8;
            instance.position[1] = Math.cos(time * 0.001 + i * 0.1) * 0.8;
        }
        this.updateTime = performance.now() - updateStart;
    }
    
    setActive(active) {
        this.isActive = active;
        if (!active) {
            // 清空画布
            const gl = this.gl;
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }
    }
    
    getStats() {
        return {
            fps: this.fps,
            uploadTime: this.uploadTime,
            renderTime: this.renderTime,
            totalTime: (this.uploadTime + this.renderTime + this.updateTime)
        };
    }

    destory(){
        this.setActive(false);
        this.canvas = null;
        this.gl = null;
    }
}

