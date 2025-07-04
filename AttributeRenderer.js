
class AttributeRenderer extends InstanceRenderer {
    constructor(canvas, method)
    {
        super(canvas, method);
    }
        
    getVaoCount()
    {
        return Math.ceil(this.instanceCount/ this.MAX_INS_COUNT_PER)
    }

    createGeometry() {
        this.vaoList = [];
        const gl = this.gl;
        
        // 创建一个简单的三角形
        const vertices = new Float32Array([
            0.0, 0.5,
            -0.5, -0.5,
            0.5, -0.5
        ]);
        
        let count = this.getVaoCount();
        for(let i = 0; i < count; i++)
        {
            const vao = gl.createVertexArray();
            this.vaoList.push(vao)

            gl.bindVertexArray(vao);
            // 顶点缓冲
            this.vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            
            const positionLoc = gl.getAttribLocation(this.program, 'a_position');
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
            
            gl.bindVertexArray(null);
        }
    }

    _initByType()
    {
        const gl = this.gl;
        let count = this.getVaoCount();
        for(let i = 0; i < count; i++)
        {
            const vao = this.vaoList[i];
            gl.bindVertexArray(vao);
        
            // 创建实例属性缓冲
            this.instancePositionBuffer = gl.createBuffer();
            this.instanceColorBuffer = gl.createBuffer();
            this.instanceScaleBuffer = gl.createBuffer();
            this.instanceRotationBuffer = gl.createBuffer();
            
            // 位置属性
            const positionLoc = gl.getAttribLocation(this.program, 'a_instancePosition');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instancePositionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.instanceCount * 3 * 4, gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(positionLoc, 1);
            
            // 颜色属性
            const colorLoc = gl.getAttribLocation(this.program, 'a_instanceColor');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.instanceCount * 4 * 4, gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(colorLoc);
            gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(colorLoc, 1);
            
            // 缩放属性
            const scaleLoc = gl.getAttribLocation(this.program, 'a_instanceScale');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceScaleBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.instanceCount * 4, gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(scaleLoc);
            gl.vertexAttribPointer(scaleLoc, 1, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(scaleLoc, 1);
            
            // 旋转属性
            const rotationLoc = gl.getAttribLocation(this.program, 'a_instanceRotation');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceRotationBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.instanceCount * 4, gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(rotationLoc);
            gl.vertexAttribPointer(rotationLoc, 1, gl.FLOAT, false, 0, 0);
            gl.vertexAttribDivisor(rotationLoc, 1);
            
            gl.bindVertexArray(null);
        }
    }

    _createVShadersByType()
    {
        return `#version 300 es
        in vec2 a_position;
        in vec3 a_instancePosition;
        in vec4 a_instanceColor;
        in float a_instanceScale;
        in float a_instanceRotation;
        
        out vec4 v_color;
        
        void main() {
            float c = cos(a_instanceRotation);
            float s = sin(a_instanceRotation);
            mat2 rotation = mat2(c, -s, s, c);
            
            vec2 position = rotation * a_position * a_instanceScale;
            position += a_instancePosition.xy;
            
            gl_Position = vec4(position, 0.0, 1.0);
            v_color = a_instanceColor;
        }`;
               
    }
    
    _updateInstanceByType()
    {
        const gl = this.gl;
        let positions = this.attriPosArray
        if(!positions)
        {
            positions = this.attriPosArray = new Float32Array(this.instanceCount * 3);
        }
        let colors = this.attriColorsArray
        if(!colors)
        {
            colors = this.attriColorsArray = new Float32Array(this.instanceCount * 4);
        }
        let scales = this.attriScalesArray
        if(!scales)
        {
            scales = new Float32Array(this.instanceCount);
        }
        let rotations = this.attriRotationsArray
        if(!rotations)
        {
            rotations = new Float32Array(this.instanceCount);
        }
        
        for (let i = 0; i < this.instanceCount; i++) {
            const instance = this.instances[i];
            positions[i * 3] = instance.position[0];
            positions[i * 3 + 1] = instance.position[1];
            positions[i * 3 + 2] = instance.position[2];
            
            colors[i * 4] = instance.color[0];
            colors[i * 4 + 1] = instance.color[1];
            colors[i * 4 + 2] = instance.color[2];
            colors[i * 4 + 3] = instance.color[3];
            
            scales[i] = instance.scale;
            rotations[i] = instance.rotation;
        }
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instancePositionBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceColorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceScaleBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, scales);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceRotationBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, rotations);
    }
      
    _renderByType()
    {
        const gl = this.gl;
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, this.instanceCount);
    }

    render(time) {
        if (!this.isActive) return;
        
        const renderStart = performance.now();
        
        const gl = this.gl;
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        let count = this.getVaoCount();
        gl.useProgram(this.program);
        for(let i = 0; i < count; i++)
        {
            const vao = this.vaoList[i];
            gl.bindVertexArray(vao);
            this._renderByType()
            gl.bindVertexArray(null);
        }
        this.renderTime = performance.now() - renderStart;
    }

}

