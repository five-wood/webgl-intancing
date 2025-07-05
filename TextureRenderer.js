class TextureRenderer extends InstanceRenderer {
    _initByType()
    {
        const gl = this.gl;
        
        // 计算纹理大小
        const texelsPerInstance = 3;
        const totalTexels = this.instanceCount * texelsPerInstance;
        this.textureWidth = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 4096);
        this.textureHeight = Math.ceil(totalTexels / this.textureWidth);
        
        // 创建纹理
        this.instanceTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.instanceTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.textureWidth, this.textureHeight, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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

    _createVShadersByType()
    {
        return `#version 300 es
        in vec2 a_position;
        
        uniform sampler2D u_instanceData;
        uniform int u_textureWidth;
        
        out vec4 v_color;
        
        vec4 getInstanceData(int instanceId, int dataIndex) {
            int pixelIndex = instanceId * 3 + dataIndex;
            int x = pixelIndex % u_textureWidth;
            int y = pixelIndex / u_textureWidth;
            return texelFetch(u_instanceData, ivec2(x, y), 0);
        }
        
        void main() {
            int id = gl_InstanceID;
            
            vec4 posData = getInstanceData(id, 0);
            vec4 colorData = getInstanceData(id, 1);
            vec4 transformData = getInstanceData(id, 2);
            
            vec3 instancePos = posData.xyz;
            vec4 instanceColor = colorData;
            float scale = transformData.x;
            float rotation = transformData.y;
            
            float c = cos(rotation);
            float s = sin(rotation);
            mat2 rotMat = mat2(c, -s, s, c);
            
            vec2 position = rotMat * a_position * scale;
            position += instancePos.xy;
            
            gl_Position = vec4(position, 0.0, 1.0);
            v_color = instanceColor;
        }`;
    }
    
    _updateInstanceByType()
    {
        const gl = this.gl;
        
        let data = this.textureData
        if(!data)
        {
            data = this.textureData = new Float32Array(this.textureWidth * this.textureHeight * 4);
        }

        const startIdx = this.curVaoIndex*this.MAX_INS_COUNT_PER;
        const endIndex = Math.min(this.instanceCount, startIdx+this.MAX_INS_COUNT_PER)
        let i = 0;
        for (let x = startIdx; x < endIndex; x++) {
            const instance = this.instances[x];
            const baseIndex = i * 3 * 4;
            
            data[baseIndex] = instance.position[0];
            data[baseIndex + 1] = instance.position[1];
            data[baseIndex + 2] = instance.position[2];
            data[baseIndex + 3] = 0;
            
            data[baseIndex + 4] = instance.color[0];
            data[baseIndex + 5] = instance.color[1];
            data[baseIndex + 6] = instance.color[2];
            data[baseIndex + 7] = instance.color[3];
            
            data[baseIndex + 8] = instance.scale;
            data[baseIndex + 9] = instance.rotation;
            data[baseIndex + 10] = 0;
            data[baseIndex + 11] = 0;
            i++;
        }
        
        for (let i = 0; i < this.instanceCount; i++) {
            
        }
        let xoffset = % this.textureWidth;
        let yoffset = 0
        gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, this.textureWidth, this.textureHeight, gl.RGBA, gl.FLOAT, data);
    }
      
    render(time) {
        if (!this.isActive) return;
        
        const renderStart = performance.now();
        const gl = this.gl;
        // 绑定vao，确认顶点数据
        gl.bindVertexArray(this.vao);
        // 绑定贴图信息
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.instanceTexture);
        const textureLoc = gl.getUniformLocation(this.program, 'u_instanceData');
        gl.uniform1i(textureLoc, 0);
        const widthLoc = gl.getUniformLocation(this.program, 'u_textureWidth');
        gl.uniform1i(widthLoc, this.textureWidth);
        //使用uniform传入当前渲染从哪个uv开始


        // 计算当前批次实际实例数
        const startIdx = this.curVaoIndex * this.MAX_INS_COUNT_PER;
        const endIdx = Math.min(this.instanceCount, startIdx + this.MAX_INS_COUNT_PER);
        const count = endIdx - startIdx;
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, count);

        this.renderTime = performance.now() - renderStart;
    }

    animate(time) {
        if (!this.isActive) {
            requestAnimationFrame((t) => this.animate(t));
            return;
        }
                
        this.updatePosAndRotation(time)

        const gl = this.gl; 
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);

        gl.bindTexture(gl.TEXTURE_2D, this.instanceTexture);
        for(let i = 0; i < this.instanceCount; i += this.MAX_INS_COUNT_PER)
        {
            this.updateInstances(time, );
            this.curVaoIndex++;
        }

        this.curVaoIndex = 0;
        for(let i = 0; i < this.instanceCount; i += this.MAX_INS_COUNT_PER)
        {
            this.render(time);
            this.curVaoIndex++;
        }
      
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
}