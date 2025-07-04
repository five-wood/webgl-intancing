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
        
        for (let i = 0; i < this.instanceCount; i++) {
            const instance = this.instances[i];
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
        }
        
        gl.bindTexture(gl.TEXTURE_2D, this.instanceTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.textureWidth, this.textureHeight, gl.RGBA, gl.FLOAT, data);
    }
      
    _renderByType()
    {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.instanceTexture);
        const textureLoc = gl.getUniformLocation(this.program, 'u_instanceData');
        gl.uniform1i(textureLoc, 0);
        
        const widthLoc = gl.getUniformLocation(this.program, 'u_textureWidth');
        gl.uniform1i(widthLoc, this.textureWidth);
        
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, this.instanceCount);
    }
}