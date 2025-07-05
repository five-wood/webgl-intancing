class UBORenderer extends InstanceRenderer {
    _initByType()
    {
        const gl = this.gl;
        
        this.maxInstancesPerBatch = this.getMaxInstancesPerBatch();
        this.batchCount = Math.ceil(this.instanceCount / this.maxInstancesPerBatch);
        
        // 创建UBO
        this.ubo = gl.createBuffer();
        const vec4Size = 16;
        const bufferSize = this.maxInstancesPerBatch * vec4Size * 3;
        
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
        gl.bufferData(gl.UNIFORM_BUFFER, bufferSize, gl.DYNAMIC_DRAW);
        
        // 获取uniform块索引并绑定
        const blockIndex = gl.getUniformBlockIndex(this.program, 'InstanceData');
        gl.uniformBlockBinding(this.program, blockIndex, 0);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.ubo);
        
        console.log(`UBO方法：最大实例数/批次 = ${this.maxInstancesPerBatch}, 批次数 = ${this.batchCount}`);
    }
        
    getMaxInstancesPerBatch() {
        // 获取UBO最大大小并计算每批次最大实例数
        const gl = this.gl;
        const maxUBOSize = gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE);
        const vec4Size = 16; // 每个vec4占16字节
        const dataPerInstance = 3; // position+scale, color, rotation
        const bytesPerInstance = vec4Size * dataPerInstance;
        return Math.floor(maxUBOSize / bytesPerInstance);
    }
    
    _createVShadersByType()
    {
        return `#version 300 es
        in vec2 a_position;
        
        layout(std140) uniform InstanceData {
            vec4 positionAndScale[${this.getMaxInstancesPerBatch()}];
            vec4 colorData[${this.getMaxInstancesPerBatch()}];
            vec4 rotationData[${this.getMaxInstancesPerBatch()}];
        } instances;
        
        uniform int u_instanceOffset;
        
        out vec4 v_color;
        
        void main() {
            int id = gl_InstanceID;
            
            vec3 instancePos = instances.positionAndScale[id].xyz;
            float scale = instances.positionAndScale[id].w;
            vec4 instanceColor = instances.colorData[id];
            float rotation = instances.rotationData[id].x;
            
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
      
    }
      
    _renderByType()
    {
        const gl = this.gl;
       // 分批绘制
       for (let batch = 0; batch < this.batchCount; batch++) {
        const startIdx = batch * this.maxInstancesPerBatch;
        const endIdx = Math.min(startIdx + this.maxInstancesPerBatch, this.instanceCount);
        const batchSize = endIdx - startIdx;
        
        // 准备当前批次的数据
        const batchData = new Float32Array(this.maxInstancesPerBatch * 12);
        
        for (let i = 0; i < batchSize; i++) {
            const instance = this.instances[startIdx + i];
            const offset = i * 4;
            
            // Position and scale
            batchData[offset] = instance.position[0];
            batchData[offset + 1] = instance.position[1];
            batchData[offset + 2] = instance.position[2];
            batchData[offset + 3] = instance.scale;
            
            // Color
            batchData[offset + this.maxInstancesPerBatch * 4] = instance.color[0];
            batchData[offset + this.maxInstancesPerBatch * 4 + 1] = instance.color[1];
            batchData[offset + this.maxInstancesPerBatch * 4 + 2] = instance.color[2];
            batchData[offset + this.maxInstancesPerBatch * 4 + 3] = instance.color[3];
            
            // Rotation
            batchData[offset + this.maxInstancesPerBatch * 8] = instance.rotation;
            batchData[offset + this.maxInstancesPerBatch * 8 + 1] = 0;
            batchData[offset + this.maxInstancesPerBatch * 8 + 2] = 0;
            batchData[offset + this.maxInstancesPerBatch * 8 + 3] = 0;
        }
        
        // 更新UBO
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, batchData);
        
        // 设置偏移量uniform
        const offsetLoc = gl.getUniformLocation(this.program, 'u_instanceOffset');
        gl.uniform1i(offsetLoc, startIdx);
        
        // 绘制当前批次
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, batchSize);
    }
    }
}