// Wait for the DOM to be fully loaded before running any code
document.addEventListener('DOMContentLoaded', function() {
    initEditor();
});

// Main initialization function
function initEditor() {
    // Scene manager to keep track of all objects and their properties
    class SceneManager {
        constructor() {
            this.objects = [];
            this.lights = [];
            this.selectedObject = null;
            this.objectCount = 0;
            this.lightCount = 0;
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            this.hdrLoaded = false;
            this.hdrFileName = null;
            
            // Texture generator variables
            this.originalImageData = null;
            this.generatedMaps = {
                baseColor: null,
                normal: null,
                roughness: null,
                displacement: null,
                ao: null,
                emissive: null
            };
            this.mapCanvases = {
                baseColor: document.getElementById('baseColorMap'),
                normal: document.getElementById('normalMap'),
                roughness: document.getElementById('roughnessMap'),
                displacement: document.getElementById('displacementMap'),
                ao: document.getElementById('aoMap'),
                emissive: document.getElementById('emissiveMap')
            };
            this.uvSettings = {
                tilingX: 1,
                tilingY: 1,
                offsetX: 0,
                offsetY: 0,
                rotation: 0
            };
        }
        
        // Add a 3D object to the scene
        addObject(object, name, type = 'mesh') {
            const id = Date.now().toString() + Math.floor(Math.random() * 1000);
            this.objectCount++;
            
            const objectData = {
                id,
                object,
                name: name || `Object ${this.objectCount}`,
                visible: true,
                type: type,
                textures: []
            };
            
            this.objects.push(objectData);
            this.updateLayerPanel();
            return objectData;
        }
        
        // Add a light to the scene
        addLight(light, name, type = 'light') {
            const id = 'light_' + Date.now().toString() + Math.floor(Math.random() * 1000);
            this.lightCount++;
            
            const lightData = {
                id,
                object: light,
                name: name || `Light ${this.lightCount}`,
                visible: true,
                type: type
            };
            
            this.objects.push(lightData);
            this.lights.push(lightData);
            
            this.updateLayerPanel();
            this.updateLightsPanel();
            
            return lightData;
        }

        // Remove an object from the scene
        removeObject(id) {
            const index = this.objects.findIndex(obj => obj.id === id);
            if (index !== -1) {
                const obj = this.objects[index];
                scene.remove(obj.object);
                this.objects.splice(index, 1);
                
                // If it's a light, also remove from lights array
                if (obj.type.includes('light')) {
                    const lightIndex = this.lights.findIndex(light => light.id === id);
                    if (lightIndex !== -1) {
                        this.lights.splice(lightIndex, 1);
                    }
                    this.updateLightsPanel();
                }
                
                if (this.selectedObject && this.selectedObject.id === id) {
                    this.selectObject(null);
                }
                this.updateLayerPanel();
            }
        }

        // Select an object in the scene
        selectObject(id) {
            if (id === null) {
                this.selectedObject = null;
                updateSceneInfo("Click on objects to select them");
                
                const objectProps = document.getElementById("objectProperties");
                if (objectProps) objectProps.classList.add("disabled");
                
                const materialProps = document.getElementById("materialProperties");
                if (materialProps) materialProps.classList.add("disabled");
                
                const texturesPanel = document.getElementById("texturesPanel");
                if (texturesPanel) texturesPanel.classList.add("disabled");
                
                const selectedName = document.querySelector('.selected-name');
                if (selectedName) selectedName.textContent = 'No selection';
                
                // Hide light-specific and geometry-specific controls
                const lightProperty = document.querySelector('.light-property');
                if (lightProperty) lightProperty.style.display = 'none';
                
                const geometryProperty = document.querySelector('.geometry-property');
                if (geometryProperty) geometryProperty.style.display = 'none';
                
                const scaleProperty = document.querySelector('.scale-property');
                if (scaleProperty) scaleProperty.style.display = 'none';
                
                return;
            }

            this.selectedObject = this.objects.find(obj => obj.id === id) || null;
            
            if (this.selectedObject) {
                // Update UI based on object type
                const objectProps = document.getElementById("objectProperties");
                if (objectProps) objectProps.classList.remove("disabled");
                
                const selectedName = document.querySelector('.selected-name');
                if (selectedName) selectedName.textContent = this.selectedObject.name;
                
                updateSceneInfo(`Selected: ${this.selectedObject.name}`);
                
                // Show/hide appropriate controls based on object type
                if (this.selectedObject.type.includes('light')) {
                    // Light object - show light controls, hide mesh controls
                    const lightProperty = document.querySelector('.light-property');
                    if (lightProperty) lightProperty.style.display = 'block';
                    
                    const geometryProperty = document.querySelector('.geometry-property');
                    if (geometryProperty) geometryProperty.style.display = 'none';
                    
                    const scaleProperty = document.querySelector('.scale-property');
                    if (scaleProperty) scaleProperty.style.display = 'none';
                    
                    const materialProps = document.getElementById("materialProperties");
                    if (materialProps) materialProps.classList.add("disabled");
                    
                    const texturesPanel = document.getElementById("texturesPanel");
                    if (texturesPanel) texturesPanel.classList.add("disabled");
                    
                    // Configure spotlight-specific controls
                    const spotProps = document.querySelectorAll('.spot-light-prop');
                    if (spotProps.length) {
                        if (this.selectedObject.type === 'light-spot') {
                            spotProps.forEach(el => el.style.display = 'block');
                        } else {
                            spotProps.forEach(el => el.style.display = 'none');
                        }
                    }
                    
                    // Update light controls
                    this.updateLightControls();
                } else {
                    // Mesh object - show mesh controls, hide light controls
                    const lightProperty = document.querySelector('.light-property');
                    if (lightProperty) lightProperty.style.display = 'none';
                    
                    const geometryProperty = document.querySelector('.geometry-property');
                    if (geometryProperty) geometryProperty.style.display = 'block';
                    
                    const scaleProperty = document.querySelector('.scale-property');
                    if (scaleProperty) scaleProperty.style.display = 'block';
                    
                    const materialProps = document.getElementById("materialProperties");
                    if (materialProps) materialProps.classList.remove("disabled");
                    
                    const texturesPanel = document.getElementById("texturesPanel");
                    if (texturesPanel) texturesPanel.classList.remove("disabled");
                    
                    // Update textures panel
                    this.updateTexturesPanel();
                }
                
                // Update layer panel to highlight selected object
                this.updateLayerPanel();
                // Update position/rotation/scale controls
                this.updateObjectControls();
                // Update material controls
                this.updateMaterialControls();
            } else {
                updateSceneInfo("Click on objects to select them");
                
                const objectProps = document.getElementById("objectProperties");
                if (objectProps) objectProps.classList.add("disabled");
                
                const materialProps = document.getElementById("materialProperties");
                if (materialProps) materialProps.classList.add("disabled");
                
                const texturesPanel = document.getElementById("texturesPanel");
                if (texturesPanel) texturesPanel.classList.add("disabled");
                
                const selectedName = document.querySelector('.selected-name');
                if (selectedName) selectedName.textContent = 'No selection';
            }
        }

        // Update the object list in the UI
        updateLayerPanel() {
            const objectList = document.getElementById('objectList');
            if (!objectList) return;
            
            objectList.innerHTML = '';

            this.objects.forEach(obj => {
                const li = document.createElement('li');
                li.dataset.id = obj.id;
                li.classList.add('animate-fade-in');
                if (this.selectedObject && this.selectedObject.id === obj.id) {
                    li.classList.add('selected');
                }

                // Create visibility toggle
                const visCheckbox = document.createElement('input');
                visCheckbox.type = 'checkbox';
                visCheckbox.checked = obj.visible;
                visCheckbox.addEventListener('change', () => {
                    obj.visible = visCheckbox.checked;
                    obj.object.visible = visCheckbox.checked;
                });

                // Create name element
                const nameSpan = document.createElement('span');
                nameSpan.className = 'layerItemName';
                nameSpan.textContent = obj.name;
                nameSpan.addEventListener('click', () => {
                    this.selectObject(obj.id);
                });

                // Create controls
                const controls = document.createElement('div');
                controls.className = 'layerItemControls';

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '×';
                deleteBtn.title = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeObject(obj.id);
                });

                controls.appendChild(deleteBtn);
                li.appendChild(visCheckbox);
                li.appendChild(nameSpan);
                li.appendChild(controls);
                objectList.appendChild(li);
            });
        }
        
        // Update lights panel in the UI
        updateLightsPanel() {
            const lightsPanel = document.getElementById('lightsManagerPanel');
            if (!lightsPanel) return;
            
            lightsPanel.innerHTML = '';
            
            this.lights.forEach(light => {
                const lightItem = document.createElement('div');
                lightItem.className = 'light-item';
                lightItem.dataset.id = light.id;
                
                if (this.selectedObject && this.selectedObject.id === light.id) {
                    lightItem.classList.add('selected');
                }
                
                // Light icon with color
                const lightIcon = document.createElement('div');
                lightIcon.className = 'light-icon';
                
                // Set color based on light type and color
                if (light.object.color) {
                    lightIcon.style.backgroundColor = `#${light.object.color.getHexString()}`;
                } else {
                    lightIcon.style.backgroundColor = '#ffffff';
                }
                
                // Light name
                const lightName = document.createElement('span');
                lightName.className = 'layerItemName';
                lightName.textContent = light.name;
                
                // Light visibility toggle
                const visCheckbox = document.createElement('input');
                visCheckbox.type = 'checkbox';
                visCheckbox.checked = light.visible;
                visCheckbox.addEventListener('change', () => {
                    light.visible = visCheckbox.checked;
                    light.object.visible = visCheckbox.checked;
                });
                
                // Click event for selection
                lightItem.addEventListener('click', () => {
                    this.selectObject(light.id);
                });
                
                // Add all elements
                lightItem.appendChild(visCheckbox);
                lightItem.appendChild(lightIcon);
                lightItem.appendChild(lightName);
                
                lightsPanel.appendChild(lightItem);
            });
            
            // Add "no lights" message if needed
            if (this.lights.length === 0) {
                const noLights = document.createElement('div');
                noLights.className = 'no-textures';
                noLights.textContent = 'No additional lights. Add a light from the Objects panel.';
                lightsPanel.appendChild(noLights);
            }
        }

        // Update position, rotation, scale controls
        updateObjectControls() {
            if (!this.selectedObject) return;

            const obj = this.selectedObject.object;

            // Update position inputs
            const posX = document.getElementById('positionX');
            const posY = document.getElementById('positionY');
            const posZ = document.getElementById('positionZ');
            
            if (posX && posY && posZ) {
                posX.value = obj.position.x.toFixed(2);
                posY.value = obj.position.y.toFixed(2);
                posZ.value = obj.position.z.toFixed(2);
            }

            // Update rotation inputs - convert to degrees for better UX
            const rotX = document.getElementById('rotateX');
            const rotY = document.getElementById('rotateY');
            const rotZ = document.getElementById('rotateZ');
            
            if (rotX && rotY && rotZ) {
                rotX.value = (obj.rotation.x * (180/Math.PI)).toFixed(1);
                rotY.value = (obj.rotation.y * (180/Math.PI)).toFixed(1);
                rotZ.value = (obj.rotation.z * (180/Math.PI)).toFixed(1);
            }

            // Update scale inputs (only for meshes)
            if (!this.selectedObject.type.includes('light')) {
                const scaleX = document.getElementById('scaleX');
                const scaleY = document.getElementById('scaleY');
                const scaleZ = document.getElementById('scaleZ');
                
                if (scaleX && scaleY && scaleZ) {
                    scaleX.value = obj.scale.x.toFixed(2);
                    scaleY.value = obj.scale.y.toFixed(2);
                    scaleZ.value = obj.scale.z.toFixed(2);
                }
            }

            // Update geometry type dropdown
            const geometrySelector = document.getElementById('changeGeometryType');
            if (geometrySelector && obj.geometry) {
                if (obj.geometry instanceof THREE.BoxGeometry) {
                    geometrySelector.value = 'box';
                } else if (obj.geometry instanceof THREE.SphereGeometry) {
                    geometrySelector.value = 'sphere';
                } else if (obj.geometry instanceof THREE.CylinderGeometry) {
                    geometrySelector.value = 'cylinder';
                } else if (obj.geometry instanceof THREE.TorusGeometry) {
                    geometrySelector.value = 'torus';
                } else if (obj.geometry instanceof THREE.PlaneGeometry) {
                    geometrySelector.value = 'plane';
                }
            }
        }
        
        // Update material controls
        updateMaterialControls() {
            if (!this.selectedObject || !this.selectedObject.object.material) return;
            
            const material = this.selectedObject.object.material;
            
            // Update color picker
            const objColor = document.getElementById('objectColor');
            if (objColor && material.color) {
                objColor.value = '#' + material.color.getHexString();
            }
            
            // Update material properties
            const metalnessInput = document.getElementById('metalness');
            const roughnessInput = document.getElementById('roughness');
            const wireframeInput = document.getElementById('wireframe');
            
            if (metalnessInput && material.metalness !== undefined) {
                metalnessInput.value = material.metalness;
            }
            
            if (roughnessInput && material.roughness !== undefined) {
                roughnessInput.value = material.roughness;
            }
            
            if (wireframeInput && material.wireframe !== undefined) {
                wireframeInput.checked = material.wireframe;
            }
        }
        
        // Update light-specific controls
        updateLightControls() {
            if (!this.selectedObject || !this.selectedObject.type.includes('light')) return;
            
            const light = this.selectedObject.object;
            
            // Update common light properties
            const lightIntensity = document.getElementById('lightIntensity');
            const lightColor = document.getElementById('lightColor');
            
            if (lightIntensity) lightIntensity.value = light.intensity;
            if (lightColor) lightColor.value = '#' + light.color.getHexString();
            
            // Handle light-specific properties
            const lightDistance = document.getElementById('lightDistance');
            if (light.distance !== undefined && lightDistance) {
                lightDistance.value = light.distance;
            }
            
            const lightCastShadow = document.getElementById('lightCastShadow');
            if (light.castShadow !== undefined && lightCastShadow) {
                lightCastShadow.checked = light.castShadow;
            }
            
            // SpotLight specific properties
            if (this.selectedObject.type === 'light-spot') {
                const lightAngle = document.getElementById('lightAngle');
                const lightPenumbra = document.getElementById('lightPenumbra');
                
                if (lightAngle) lightAngle.value = THREE.MathUtils.radToDeg(light.angle).toFixed(1);
                if (lightPenumbra) lightPenumbra.value = light.penumbra;
            }
        }
        
        // Process an uploaded texture for PBR map generation
        processTextureForPBR(file) {
            if (!file || !file.type.match('image.*')) {
                showNotification('Please upload an image file.', 'error');
                return;
            }
            
            // Show loading progress
            showProcessingIndicator('Reading texture file...', 10);
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    updateProcessingProgress(30);
                    updateProcessingMessage('Processing image...');
                    
                    // Display the uploaded image
                    const uploadedImg = document.getElementById('uploadedTextureImg');
                    const previewOverlay = document.getElementById('texturePreviewOverlay');
                    
                    if (uploadedImg && previewOverlay) {
                        uploadedImg.src = e.target.result;
                        previewOverlay.style.display = 'flex';
                    }
                    
                    // Load image to process it
                    const img = new Image();
                    img.onload = () => {
                        try {
                            updateProcessingProgress(50);
                            updateProcessingMessage('Analyzing texture...');
                            
                            // Store the original image data
                            this.originalImageData = this.getImageData(img);
                            
                            updateProcessingProgress(60);
                            updateProcessingMessage('Generating texture maps...');
                            
                            // Generate the texture maps
                            this.generateTextureMaps(img);
                            
                            updateProcessingProgress(90);
                            updateProcessingMessage('Applying to material...');
                            
                            // Apply the generated textures to the selected object
                            this.applyGeneratedTexturesToMaterial();
                            
                            // Complete processing
                            setTimeout(() => {
                                updateProcessingProgress(100);
                                hideProcessingIndicator();
                                showNotification('Texture maps generated and applied!', 'success');
                            }, 300);
                        } catch (error) {
                            console.error('Error processing image:', error);
                            hideProcessingIndicator();
                            showNotification('Error processing image. Please try another one.', 'error');
                        }
                    };
                    
                    img.src = e.target.result;
                } catch (error) {
                    console.error('Error loading texture image:', error);
                    hideProcessingIndicator();
                    showNotification('Error loading image. Please try another one.', 'error');
                }
            };
            
            reader.onerror = () => {
                hideProcessingIndicator();
                showNotification('Error reading file. Please try again.', 'error');
            };
            
            reader.readAsDataURL(file);
        }
        
        // Get image data from an image element
        getImageData(img) {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        
        // Generate all texture maps from an image
        generateTextureMaps(img) {
            // Generate base color map (original texture)
            this.generateBaseColorMap(img);
            
            // Generate normal map
            this.generateNormalMap(this.originalImageData);
            
            // Generate roughness map
            this.generateRoughnessMap(this.originalImageData);
            
            // Generate displacement map
            this.generateDisplacementMap(this.originalImageData);
            
            // Generate ambient occlusion map
            this.generateAOMap(this.originalImageData);
            
            // Generate emissive map
            this.generateEmissiveMap(this.originalImageData);
        }
        
        // Generate base color map
        generateBaseColorMap(img) {
            // Set up canvas
            const canvas = this.mapCanvases.baseColor;
            if (!canvas) return;
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw the image
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Create texture
            const texture = new THREE.Texture(canvas);
            if (renderer) {
                texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            }
            texture.needsUpdate = true;
            
            // Store the texture
            this.generatedMaps.baseColor = texture;
        }
        
        // Generate normal map
        generateNormalMap(imageData) {
            // Set up canvas
            const canvas = this.mapCanvases.normal;
            if (!canvas) return;
            
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            const ctx = canvas.getContext('2d');
            const outputData = ctx.createImageData(imageData.width, imageData.height);
            
            // Sobel operators for edge detection
            const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
            const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
            
            // Normal strength from slider
            const normalStrength = parseFloat(document.getElementById('normalStrength').value) || 1.0;
            
            // Process each pixel
            for (let y = 0; y < imageData.height; y++) {
                for (let x = 0; x < imageData.width; x++) {
                    // Calculate gradient using Sobel operators
                    let gx = 0;
                    let gy = 0;
                    
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const px = Math.min(imageData.width - 1, Math.max(0, x + kx));
                            const py = Math.min(imageData.height - 1, Math.max(0, y + ky));
                            
                            const idx = (py * imageData.width + px) * 4;
                            // Use grayscale value (average of RGB)
                            const val = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
                            
                            gx += val * sobelX[(ky + 1) * 3 + (kx + 1)];
                            gy += val * sobelY[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    
                    // Convert gradient to normal vector
                    const scale = 5.0 * normalStrength; // Apply strength parameter
                    const nx = -gx * scale;
                    const ny = -gy * scale;
                    const nz = 255; // Higher Z value for more pronounced effect
                    
                    // Normalize
                    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
                    
                    // Convert from [-1, 1] to [0, 1] range for RGB
                    const outIdx = (y * imageData.width + x) * 4;
                    outputData.data[outIdx] = ((nx / length) * 0.5 + 0.5) * 255;
                    outputData.data[outIdx + 1] = ((ny / length) * 0.5 + 0.5) * 255;
                    outputData.data[outIdx + 2] = ((nz / length) * 0.5 + 0.5) * 255;
                    outputData.data[outIdx + 3] = 255; // Alpha
                }
            }
            
            // Put the processed data back to canvas
            ctx.putImageData(outputData, 0, 0);
            
            // Create texture
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            
            // Store the texture
            this.generatedMaps.normal = texture;
        }
        
        // Generate roughness map
        generateRoughnessMap(imageData) {
            // Set up canvas
            const canvas = this.mapCanvases.roughness;
            if (!canvas) return;
            
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            const ctx = canvas.getContext('2d');
            const outputData = ctx.createImageData(imageData.width, imageData.height);
            
            // Roughness strength from slider
            const roughnessStrength = parseFloat(document.getElementById('roughnessStrength').value) || 1.0;
            
            // Calculate local variance for roughness estimation
            for (let y = 0; y < imageData.height; y++) {
                for (let x = 0; x < imageData.width; x++) {
                    const idx = (y * imageData.width + x) * 4;
                    
                    // Sample neighborhood
                    let sum = 0;
                    let sumSq = 0;
                    let count = 0;
                    
                    for (let ky = -2; ky <= 2; ky++) {
                        for (let kx = -2; kx <= 2; kx++) {
                            const px = Math.min(imageData.width - 1, Math.max(0, x + kx));
                            const py = Math.min(imageData.height - 1, Math.max(0, y + ky));
                            
                            const nIdx = (py * imageData.width + px) * 4;
                            const val = (imageData.data[nIdx] + imageData.data[nIdx + 1] + imageData.data[nIdx + 2]) / 3;
                            
                            sum += val;
                            sumSq += val * val;
                            count++;
                        }
                    }
                    
                    // Calculate variance
                    const mean = sum / count;
                    const variance = Math.sqrt(Math.max(0, (sumSq / count) - (mean * mean)));
                    
                    // Normalize and scale by roughness strength
                    let roughness = Math.min(1.0, variance / 50.0) * roughnessStrength;
                    
                    // Adjust based on brightness - darker areas are usually rougher
                    const brightness = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
                    roughness = roughness * 0.7 + (1.0 - brightness / 255) * 0.3;
                    
                    // Convert to grayscale value
                    const pixelValue = roughness * 255;
                    
                    outputData.data[idx] = pixelValue;
                    outputData.data[idx + 1] = pixelValue;
                    outputData.data[idx + 2] = pixelValue;
                    outputData.data[idx + 3] = 255; // Alpha
                }
            }
            
            // Put the processed data back to canvas
            ctx.putImageData(outputData, 0, 0);
            
            // Create texture
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            
            // Store the texture
            this.generatedMaps.roughness = texture;
        }
        
        // Generate displacement map
        generateDisplacementMap(imageData) {
            // Set up canvas
            const canvas = this.mapCanvases.displacement;
            if (!canvas) return;
            
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            const ctx = canvas.getContext('2d');
            const outputData = ctx.createImageData(imageData.width, imageData.height);
            
            // Displacement strength from slider
            const displacementStrength = parseFloat(document.getElementById('displacementStrength').value) || 0.2;
            
            // Convert to grayscale with enhanced contrast
            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                
                // Calculate brightness
                let brightness = 0.299 * r + 0.587 * g + 0.114 * b;
                
                // Enhance contrast
                brightness = Math.max(0, Math.min(255, (brightness - 128) * 1.5 + 128));
                
                // Apply displacement strength
                brightness = brightness * displacementStrength;
                
                outputData.data[i] = brightness;
                outputData.data[i + 1] = brightness;
                outputData.data[i + 2] = brightness;
                outputData.data[i + 3] = 255; // Alpha
            }
            
            // Put the processed data back to canvas
            ctx.putImageData(outputData, 0, 0);
            
            // Create texture
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            
            // Store the texture
            this.generatedMaps.displacement = texture;
        }
        
        // Generate ambient occlusion map
        generateAOMap(imageData) {
            // Set up canvas
            const canvas = this.mapCanvases.ao;
            if (!canvas) return;
            
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            const ctx = canvas.getContext('2d');
            const outputData = ctx.createImageData(imageData.width, imageData.height);
            
            // AO strength from slider
            const aoStrength = parseFloat(document.getElementById('aoStrength').value) || 1.0;
            
            // Create blurred copy for edge detection
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageData.width;
            tempCanvas.height = imageData.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw original image
            tempCtx.putImageData(imageData, 0, 0);
            
            // Apply blur
            tempCtx.filter = 'blur(2px)';
            tempCtx.drawImage(tempCanvas, 0, 0);
            
            // Get blurred data
            const blurredData = tempCtx.getImageData(0, 0, imageData.width, imageData.height);
            
            // Generate AO by analyzing edges and shadows
            for (let y = 0; y < imageData.height; y++) {
                for (let x = 0; x < imageData.width; x++) {
                    const idx = (y * imageData.width + x) * 4;
                    
                    // Edge detection in 5x5 neighborhood
                    let edgeValue = 0;
                    let sampleCount = 0;
                    
                    for (let ky = -2; ky <= 2; ky++) {
                        for (let kx = -2; kx <= 2; kx++) {
                            if (kx === 0 && ky === 0) continue;
                            
                            const px = Math.min(imageData.width - 1, Math.max(0, x + kx));
                            const py = Math.min(imageData.height - 1, Math.max(0, y + ky));
                            
                            const nIdx = (py * imageData.width + px) * 4;
                            
                            // Get grayscale values
                            const centerVal = (blurredData.data[idx] + blurredData.data[idx + 1] + blurredData.data[idx + 2]) / 3;
                            const neighborVal = (blurredData.data[nIdx] + blurredData.data[nIdx + 1] + blurredData.data[nIdx + 2]) / 3;
                            
                            // Accumulate absolute difference
                            edgeValue += Math.abs(centerVal - neighborVal);
                            sampleCount++;
                        }
                    }
                    
                    // Calculate average edge value
                    const avgEdge = edgeValue / sampleCount;
                    
                    // Calculate AO value - edges and darker areas get more occlusion
                    let aoValue = 255 - (avgEdge * 2);
                    
                    // Adjust based on original brightness
                    const brightness = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
                    aoValue = aoValue * 0.6 + (255 - brightness) * 0.4;
                    
                    // Apply AO strength
                    aoValue = Math.min(255, Math.max(0, aoValue * aoStrength));
                    
                    // Set grayscale values
                    outputData.data[idx] = aoValue;
                    outputData.data[idx + 1] = aoValue;
                    outputData.data[idx + 2] = aoValue;
                    outputData.data[idx + 3] = 255; // Alpha
                }
            }
            
            // Put the processed data back to canvas
            ctx.putImageData(outputData, 0, 0);
            
            // Create texture
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            
            // Store the texture
            this.generatedMaps.ao = texture;
        }
        
        // Generate emissive map
        generateEmissiveMap(imageData) {
            // Set up canvas
            const canvas = this.mapCanvases.emissive;
            if (!canvas) return;
            
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            const ctx = canvas.getContext('2d');
            const outputData = ctx.createImageData(imageData.width, imageData.height);
            
            // Emissive strength from slider
            const emissiveStrength = parseFloat(document.getElementById('emissiveStrength').value) || 0.0;
            
            // Only keep bright areas for emission
            const threshold = 210; // Only brightest parts emit light
            
            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                
                // Calculate brightness
                const brightness = (r + g + b) / 3;
                
                // Threshold to determine emissive parts
                let emissionValue = 0;
                if (brightness > threshold) {
                    emissionValue = ((brightness - threshold) / (255 - threshold)) * 255 * emissiveStrength;
                    
                    // Keep color information
                    outputData.data[i] = r * (emissionValue / 255);
                    outputData.data[i + 1] = g * (emissionValue / 255);
                    outputData.data[i + 2] = b * (emissionValue / 255);
                } else {
                    outputData.data[i] = 0;
                    outputData.data[i + 1] = 0;
                    outputData.data[i + 2] = 0;
                }
                
                outputData.data[i + 3] = 255; // Alpha
            }
            
            // Put the processed data back to canvas
            ctx.putImageData(outputData, 0, 0);
            
            // Create texture
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            
            // Store the texture
            this.generatedMaps.emissive = texture;
        }
        
        // Update texture map strength
        updateMapStrength(mapType) {
            // Get strength value
            let strength = 1.0;
            let value = document.getElementById(`${mapType}Strength`).value;
            const valueDisplay = document.getElementById(`${mapType}StrengthValue`);
            
            if (valueDisplay) {
                valueDisplay.textContent = parseFloat(value).toFixed(2);
            }
            
            // Regenerate the map
            switch (mapType) {
                case 'normal':
                    if (this.originalImageData) {
                        this.generateNormalMap(this.originalImageData);
                    }
                    break;
                case 'roughness':
                    if (this.originalImageData) {
                        this.generateRoughnessMap(this.originalImageData);
                    }
                    break;
                case 'displacement':
                    if (this.originalImageData) {
                        this.generateDisplacementMap(this.originalImageData);
                    }
                    break;
                case 'ao':
                    if (this.originalImageData) {
                        this.generateAOMap(this.originalImageData);
                    }
                    break;
                case 'emissive':
                    if (this.originalImageData) {
                        this.generateEmissiveMap(this.originalImageData);
                    }
                    break;
            }
            
            // Apply updated maps to material
            this.applyGeneratedTexturesToMaterial();
        }
        
        // Smart enhance textures based on selected material type
        smartEnhanceTextures() {
            if (!this.originalImageData) {
                showNotification('Please upload a texture first', 'error');
                return;
            }
            
            // Get material type
            const materialType = document.getElementById('materialTypeSelect').value;
            
            // Show processing indicator
            showProcessingIndicator('Analyzing texture...', 10);
            
            // Simulate processing
            setTimeout(() => {
                updateProcessingProgress(40);
                updateProcessingMessage('Identifying material properties...');
                
                setTimeout(() => {
                    updateProcessingProgress(70);
                    updateProcessingMessage('Applying optimized settings...');
                    
                    // Apply optimized settings based on material type
                    switch (materialType) {
                        case 'metal':
                            // Metal settings
                            document.getElementById('normalStrength').value = 0.8;
                            document.getElementById('roughnessStrength').value = 0.2;
                            document.getElementById('aoStrength').value = 0.4; 
                            document.getElementById('displacementStrength').value = 0.1;
                            document.getElementById('emissiveStrength').value = 0;
                            
                            // Update material metalness
                            const metalnessInput = document.getElementById('metalness');
                            if (metalnessInput) metalnessInput.value = 0.9;
                            break;
                            
                        case 'wood':
                            // Wood settings
                            document.getElementById('normalStrength').value = 1.2;
                            document.getElementById('roughnessStrength').value = 0.7;
                            document.getElementById('aoStrength').value = 0.6;
                            document.getElementById('displacementStrength').value = 0.3;
                            document.getElementById('emissiveStrength').value = 0;
                            
                            // Update material metalness
                            const woodMetalness = document.getElementById('metalness');
                            if (woodMetalness) woodMetalness.value = 0;
                            break;
                            
                        case 'stone':
                            // Stone settings
                            document.getElementById('normalStrength').value = 1.5;
                            document.getElementById('roughnessStrength').value = 0.8;
                            document.getElementById('aoStrength').value = 0.7;
                            document.getElementById('displacementStrength').value = 0.5;
                            document.getElementById('emissiveStrength').value = 0;
                            
                            // Update material metalness
                            const stoneMetalness = document.getElementById('metalness');
                            if (stoneMetalness) stoneMetalness.value = 0;
                            break;
                            
                        case 'fabric':
                            // Fabric settings
                            document.getElementById('normalStrength').value = 0.7;
                            document.getElementById('roughnessStrength').value = 0.9;
                            document.getElementById('aoStrength').value = 0.4;
                            document.getElementById('displacementStrength').value = 0.15;
                            document.getElementById('emissiveStrength').value = 0;
                            
                            // Update material metalness
                            const fabricMetalness = document.getElementById('metalness');
                            if (fabricMetalness) fabricMetalness.value = 0;
                            break;
                            
                        case 'plastic':
                            // Plastic settings
                            document.getElementById('normalStrength').value = 0.6;
                            document.getElementById('roughnessStrength').value = 0.3;
                            document.getElementById('aoStrength').value = 0.3;
                            document.getElementById('displacementStrength').value = 0.05;
                            document.getElementById('emissiveStrength').value = 0;
                            
                            // Update material metalness
                            const plasticMetalness = document.getElementById('metalness');
                            if (plasticMetalness) plasticMetalness.value = 0.1;
                            break;
                            
                        default:
                            // Auto-detect - simple analysis
                            const avgBrightness = this.analyzeImageBrightness(this.originalImageData);
                            const complexity = this.analyzeTextureComplexity(this.originalImageData);
                            
                            if (avgBrightness > 200 && complexity < 50) {
                                // Likely metal
                                document.getElementById('normalStrength').value = 0.8;
                                document.getElementById('roughnessStrength').value = 0.2;
                                document.getElementById('aoStrength').value = 0.3;
                                document.getElementById('displacementStrength').value = 0.1;
                                document.getElementById('emissiveStrength').value = 0;
                                
                                const autoMetalness = document.getElementById('metalness');
                                if (autoMetalness) autoMetalness.value = 0.9;
                                
                                document.getElementById('materialTypeSelect').value = 'metal';
                            } else if (complexity > 150) {
                                // Likely organic
                                document.getElementById('normalStrength').value = 1.2;
                                document.getElementById('roughnessStrength').value = 0.7;
                                document.getElementById('aoStrength').value = 0.6;
                                document.getElementById('displacementStrength').value = 0.3;
                                document.getElementById('emissiveStrength').value = 0;
                                
                                const autoMetalness = document.getElementById('metalness');
                                if (autoMetalness) autoMetalness.value = 0;
                                
                                document.getElementById('materialTypeSelect').value = complexity > 200 ? 'stone' : 'wood';
                            } else {
                                // Generic material
                                document.getElementById('normalStrength').value = 1.0;
                                document.getElementById('roughnessStrength').value = 0.5;
                                document.getElementById('aoStrength').value = 0.5;
                                document.getElementById('displacementStrength').value = 0.2;
                                document.getElementById('emissiveStrength').value = 0;
                                
                                const autoMetalness = document.getElementById('metalness');
                                if (autoMetalness) autoMetalness.value = 0.1;
                            }
                            break;
                    }
                    
                    // Update value displays
                    document.getElementById('normalStrengthValue').textContent = 
                        parseFloat(document.getElementById('normalStrength').value).toFixed(2);
                    document.getElementById('roughnessStrengthValue').textContent = 
                        parseFloat(document.getElementById('roughnessStrength').value).toFixed(2);
                    document.getElementById('aoStrengthValue').textContent = 
                        parseFloat(document.getElementById('aoStrength').value).toFixed(2);
                    document.getElementById('displacementStrengthValue').textContent = 
                        parseFloat(document.getElementById('displacementStrength').value).toFixed(2);
                    document.getElementById('emissiveStrengthValue').textContent = 
                        parseFloat(document.getElementById('emissiveStrength').value).toFixed(2);
                    
                    // Regenerate maps
                    this.generateTextureMaps(new Image().src = document.getElementById('uploadedTextureImg').src);
                    
                    // Update material
                    this.applyGeneratedTexturesToMaterial();
                    this.updateMaterialControls();
                    
                    // Complete
                    setTimeout(() => {
                        updateProcessingProgress(100);
                        hideProcessingIndicator();
                        showNotification('Material optimized for ' + materialType, 'success');
                    }, 500);
                }, 500);
            }, 500);
        }
        
        // Analyze image brightness (helper for smart enhance)
        analyzeImageBrightness(imageData) {
            let totalBrightness = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = imageData.data[i];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];
                totalBrightness += (r + g + b) / 3;
            }
            return totalBrightness / (imageData.width * imageData.height);
        }
        
        // Analyze texture complexity (helper for smart enhance)
        analyzeTextureComplexity(imageData) {
            // Simple edge detection to estimate texture complexity
            let edgeCount = 0;
            const threshold = 30;
            
            for (let y = 1; y < imageData.height - 1; y++) {
                for (let x = 1; x < imageData.width - 1; x++) {
                    const idx = (y * imageData.width + x) * 4;
                    const idxUp = ((y-1) * imageData.width + x) * 4;
                    const idxRight = (y * imageData.width + (x+1)) * 4;
                    
                    const currentPixel = (imageData.data[idx] + imageData.data[idx+1] + imageData.data[idx+2]) / 3;
                    const upPixel = (imageData.data[idxUp] + imageData.data[idxUp+1] + imageData.data[idxUp+2]) / 3;
                    const rightPixel = (imageData.data[idxRight] + imageData.data[idxRight+1] + imageData.data[idxRight+2]) / 3;
                    
                    if (Math.abs(currentPixel - upPixel) > threshold || 
                        Math.abs(currentPixel - rightPixel) > threshold) {
                        edgeCount++;
                    }
                }
            }
            
            // Normalize to 0-255 range
            return (edgeCount / (imageData.width * imageData.height)) * 255;
        }
        
        // Apply generated textures to selected object's material
        applyGeneratedTexturesToMaterial() {
            if (!this.selectedObject || !this.selectedObject.object.material) {
                return;
            }
            
            const material = this.selectedObject.object.material;
            
            // Apply maps
            if (this.generatedMaps.baseColor) {
                material.map = this.generatedMaps.baseColor;
            }
            
            if (this.generatedMaps.normal) {
                material.normalMap = this.generatedMaps.normal;
                material.normalScale = new THREE.Vector2(
                    parseFloat(document.getElementById('normalStrength').value),
                    parseFloat(document.getElementById('normalStrength').value)
                );
            }
            
            if (this.generatedMaps.roughness) {
                material.roughnessMap = this.generatedMaps.roughness;
                material.roughness = parseFloat(document.getElementById('roughnessStrength').value);
            }
            
            if (this.generatedMaps.displacement) {
                material.displacementMap = this.generatedMaps.displacement;
                material.displacementScale = parseFloat(document.getElementById('displacementStrength').value);
            }
            
            if (this.generatedMaps.ao) {
                material.aoMap = this.generatedMaps.ao;
                material.aoMapIntensity = parseFloat(document.getElementById('aoStrength').value);
                
                // Ensure uv2 attribute is set for aoMap
                if (this.selectedObject.object.geometry) {
                    this.selectedObject.object.geometry.setAttribute('uv2', this.selectedObject.object.geometry.attributes.uv);
                }
            }
            
            if (this.generatedMaps.emissive) {
                material.emissiveMap = this.generatedMaps.emissive;
                material.emissive = new THREE.Color(0xffffff);
                material.emissiveIntensity = parseFloat(document.getElementById('emissiveStrength').value);
            }
            
            // Apply UV mapping settings
            this.applyUVSettings();
            
            // Update material
            material.needsUpdate = true;
        }
        
        // Apply UV mapping settings
        applyUVSettings() {
            if (!this.selectedObject || !this.selectedObject.object.material) {
                return;
            }
            
            const material = this.selectedObject.object.material;
            
            // Get UV settings
            this.uvSettings.tilingX = parseFloat(document.getElementById('uvTilingX').value) || 1;
            this.uvSettings.tilingY = parseFloat(document.getElementById('uvTilingY').value) || 1;
            this.uvSettings.offsetX = parseFloat(document.getElementById('uvOffsetX').value) || 0;
            this.uvSettings.offsetY = parseFloat(document.getElementById('uvOffsetY').value) || 0;
            this.uvSettings.rotation = parseFloat(document.getElementById('uvRotation').value) || 0;
            
            // Apply to all texture maps
            const maps = [
                'map', 'normalMap', 'roughnessMap', 'displacementMap', 
                'aoMap', 'emissiveMap', 'metalnessMap'
            ];
            
            maps.forEach(mapName => {
                if (material[mapName]) {
                    // Set wrapping mode
                    material[mapName].wrapS = THREE.RepeatWrapping;
                    material[mapName].wrapT = THREE.RepeatWrapping;
                    
                    // Set repeat (tiling)
                    material[mapName].repeat.set(
                        this.uvSettings.tilingX,
                        this.uvSettings.tilingY
                    );
                    
                    // Set offset
                    material[mapName].offset.set(
                        this.uvSettings.offsetX,
                        this.uvSettings.offsetY
                    );
                    
                    // Set rotation (converted to radians)
                    material[mapName].rotation = this.uvSettings.rotation * (Math.PI / 180);
                    
                    // Ensure texture updates
                    material[mapName].needsUpdate = true;
                }
            });
        }
        
        // Download a texture as an image
        downloadMap(mapType) {
            const canvas = this.mapCanvases[mapType];
            if (!canvas) {
                showNotification('Map not available', 'error');
                return;
            }
            
            // Create download link
            const link = document.createElement('a');
            link.download = `${mapType}-map.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            showNotification(`${mapType} map downloaded`, 'success');
        }
        
        // Export all selected maps as a ZIP file
        exportMapsAsZip() {
            if (!this.originalImageData) {
                showNotification('No textures to export', 'error');
                return;
            }
            
            if (typeof JSZip === 'undefined') {
                showNotification('JSZip library not available', 'error');
                return;
            }
            
            // Show processing indicator
            showProcessingIndicator('Preparing texture maps...', 10);
            
            // Create new zip
            const zip = new JSZip();
            let exportCount = 0;
            
            // Get selected format
            let format = 'png';
            let mimeType = 'image/png';
            
            document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
                if (radio.checked) {
                    format = radio.value;
                    mimeType = `image/${format}`;
                }
            });
            
            // Add maps to zip based on checkboxes
            const mapTypes = ['baseColor', 'normal', 'roughness', 'displacement', 'ao', 'emissive'];
            let progress = 20;
            
            mapTypes.forEach(mapType => {
                const checkbox = document.getElementById(`export${mapType.charAt(0).toUpperCase() + mapType.slice(1)}`);
                if (checkbox && checkbox.checked && this.mapCanvases[mapType]) {
                    const canvas = this.mapCanvases[mapType];
                    const dataUrl = canvas.toDataURL(mimeType);
                    
                    // Convert data URL to blob
                    const byteString = atob(dataUrl.split(',')[1]);
                    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                    
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    
                    const blob = new Blob([ab], {type: mimeString});
                    
                    // Add to zip
                    zip.file(`texture_${mapType}.${format}`, blob);
                    exportCount++;
                    
                    // Update progress
                    progress += 10;
                    updateProcessingProgress(Math.min(90, progress));
                }
            });
            
            if (exportCount === 0) {
                hideProcessingIndicator();
                showNotification('Please select at least one map to export', 'warning');
                return;
            }
            
            // Generate the zip file
            updateProcessingMessage('Creating ZIP file...');
            
            zip.generateAsync({type: 'blob'})
                .then(content => {
                    // Create download link
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(content);
                    link.download = 'texture_maps.zip';
                    link.click();
                    
                    // Clean up
                    setTimeout(() => {
                        URL.revokeObjectURL(link.href);
                        updateProcessingProgress(100);
                        hideProcessingIndicator();
                        showNotification(`${exportCount} texture maps exported successfully`, 'success');
                        
                        // Hide export options
                        document.querySelector('.export-options').style.display = 'none';
                    }, 500);
                })
                .catch(error => {
                    console.error('Error creating ZIP:', error);
                    hideProcessingIndicator();
                    showNotification('Error creating ZIP file', 'error');
                });
        }
        
        // Add texture to selected object
        addTexture(textureFile) {
            if (!this.selectedObject || this.selectedObject.type.includes('light')) {
                updateSceneInfo('Please select an object first', true);
                return;
            }
            
            const url = URL.createObjectURL(textureFile);
            const textureName = textureFile.name || 'Texture ' + (this.selectedObject.textures.length + 1);
            
            // Show loading message
            updateSceneInfo(`Loading texture ${textureName}...`);
            
            textureLoader.load(url, 
                // Success callback
                (texture) => {
                    // Create texture data
                    const textureData = {
                        id: Date.now().toString() + Math.floor(Math.random() * 1000),
                        name: textureName,
                        texture: texture,
                        intensity: 1.0,
                        opacity: 1.0,
                        url: url,
                        type: 'diffuse' // Default type - diffuse, normal, roughness, etc.
                    };
                    
                    // Add to object's textures
                    this.selectedObject.textures.push(textureData);
                    
                    // Apply texture to material
                    this.updateObjectMaterial();
                    
                    // Update UI
                    this.updateTexturesPanel();
                    
                    updateSceneInfo(`Texture ${textureName} added successfully`, false, 'success');
                },
                // Progress callback
                undefined,
                // Error callback
                (error) => {
                    console.error('Error loading texture:', error);
                    updateSceneInfo(`Error loading texture: ${error.message}`, true);
                    URL.revokeObjectURL(url);
                }
            );
        }
        
        // Update textures panel in UI
        updateTexturesPanel() {
            const texturesList = document.getElementById('texturesList');
            if (!texturesList) return;
            
            texturesList.innerHTML = '';
            
            if (!this.selectedObject || !this.selectedObject.textures || this.selectedObject.textures.length === 0) {
                const noTextures = document.createElement('div');
                noTextures.className = 'no-textures';
                noTextures.textContent = 'No textures added. Click the + Add button to add textures.';
                texturesList.appendChild(noTextures);
                return;
            }
            
            this.selectedObject.textures.forEach(texture => {
                const textureItem = document.createElement('div');
                textureItem.className = 'texture-item animate-fade-in';
                
                // Texture preview (use a canvas to show the actual texture)
                const previewContainer = document.createElement('div');
                previewContainer.className = 'texture-preview';
                
                // Create a mini canvas to display texture preview
                const canvas = document.createElement('canvas');
                canvas.width = 40;
                canvas.height = 40;
                const ctx = canvas.getContext('2d');
                
                // Create an image from the texture
                const image = new Image();
                image.onload = () => {
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                };
                
                // If texture has an image
                if (texture.texture.image) {
                    image.src = texture.url;
                } else {
                    // Fallback - draw colored square
                    ctx.fillStyle = '#aaaaaa';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                previewContainer.appendChild(canvas);
                
                // Texture info
                const textureInfo = document.createElement('div');
                textureInfo.className = 'texture-info';
                
                const textureName = document.createElement('div');
                textureName.className = 'texture-name';
                textureName.textContent = texture.name;
                
                // Texture type selector
                const textureTypeContainer = document.createElement('div');
                textureTypeContainer.className = 'texture-type-container';
                
                const textureTypeLabel = document.createElement('label');
                textureTypeLabel.textContent = 'Type:';
                
                const textureTypeSelect = document.createElement('select');
                textureTypeSelect.className = 'texture-type';
                
                const textureTypes = ['diffuse', 'normal', 'roughness', 'metalness', 'emissive', 'alpha'];
                textureTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                    option.selected = texture.type === type;
                    textureTypeSelect.appendChild(option);
                });
                
                textureTypeSelect.addEventListener('change', () => {
                    texture.type = textureTypeSelect.value;
                    this.updateObjectMaterial();
                });
                
                textureTypeContainer.appendChild(textureTypeLabel);
                textureTypeContainer.appendChild(textureTypeSelect);
                
                // Texture intensity slider
                const intensityContainer = document.createElement('div');
                intensityContainer.className = 'texture-slider-container';
                
                const intensityLabel = document.createElement('label');
                intensityLabel.textContent = 'Intensity:';
                
                const intensitySlider = document.createElement('input');
                intensitySlider.type = 'range';
                intensitySlider.min = '0';
                intensitySlider.max = '1';
                intensitySlider.step = '0.01';
                intensitySlider.value = texture.intensity;
                
                intensitySlider.addEventListener('input', () => {
                    texture.intensity = parseFloat(intensitySlider.value);
                    this.updateObjectMaterial();
                });
                
                intensityContainer.appendChild(intensityLabel);
                intensityContainer.appendChild(intensitySlider);
                
                // Texture controls (delete button)
                const textureControls = document.createElement('div');
                textureControls.className = 'texture-controls';
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-texture-btn';
                deleteButton.textContent = '×';
                deleteButton.title = 'Remove Texture';
                
                deleteButton.addEventListener('click', () => {
                    const index = this.selectedObject.textures.findIndex(t => t.id === texture.id);
                    if (index !== -1) {
                        this.selectedObject.textures.splice(index, 1);
                        this.updateObjectMaterial();
                        this.updateTexturesPanel();
                    }
                });
                
                textureControls.appendChild(deleteButton);
                
                // Assemble the texture item
                textureInfo.appendChild(textureName);
                textureInfo.appendChild(textureTypeContainer);
                textureInfo.appendChild(intensityContainer);
                
                textureItem.appendChild(previewContainer);
                textureItem.appendChild(textureInfo);
                textureItem.appendChild(textureControls);
                
                texturesList.appendChild(textureItem);
            });
        }
        
        // Update object material with textures
        updateObjectMaterial() {
            if (!this.selectedObject || this.selectedObject.type.includes('light')) return;
            
            const obj = this.selectedObject.object;
            if (!obj.material) return;
            
            const textures = this.selectedObject.textures || [];
            
            // Start with a clean material (preserving color and basic properties)
            const color = obj.material.color.clone();
            const metalness = obj.material.metalness !== undefined ? obj.material.metalness : 0;
            const roughness = obj.material.roughness !== undefined ? obj.material.roughness : 1;
            const wireframe = obj.material.wireframe || false;
            
            // Create a new material (we use MeshStandardMaterial for PBR capabilities)
            const material = new THREE.MeshStandardMaterial({
                color: color,
                metalness: metalness,
                roughness: roughness,
                wireframe: wireframe
            });
            
            // Apply environment map if scene has one
            if (scene.environment) {
                material.envMap = scene.environment;
                material.envMapIntensity = 1.0;
            }
            
            // Apply textures based on their type
            textures.forEach(textureData => {
                const texture = textureData.texture;
                const intensity = textureData.intensity || 1.0;
                
                // Set proper texture settings
                texture.encoding = THREE.sRGBEncoding;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                
                switch (textureData.type) {
                    case 'diffuse':
                        material.map = texture;
                        material.map.encoding = THREE.sRGBEncoding;
                        break;
                    case 'normal':
                        material.normalMap = texture;
                        material.normalScale = new THREE.Vector2(intensity, intensity);
                        break;
                    case 'roughness':
                        material.roughnessMap = texture;
                        material.roughness = intensity;
                        break;
                    case 'metalness':
                        material.metalnessMap = texture;
                        material.metalness = intensity;
                        break;
                    case 'emissive':
                        material.emissiveMap = texture;
                        material.emissive = new THREE.Color(0xffffff);
                        material.emissiveIntensity = intensity;
                        break;
                    case 'alpha':
                        material.alphaMap = texture;
                        material.transparent = true;
                        material.opacity = intensity;
                        break;
                }
            });
            
            // Apply the generated PBR textures if available
            if (this.generatedMaps.baseColor && !material.map) {
                material.map = this.generatedMaps.baseColor;
            }
            
            if (this.generatedMaps.normal && !material.normalMap) {
                material.normalMap = this.generatedMaps.normal;
                material.normalScale = new THREE.Vector2(
                    parseFloat(document.getElementById('normalStrength').value),
                    parseFloat(document.getElementById('normalStrength').value)
                );
            }
            
            if (this.generatedMaps.roughness && !material.roughnessMap) {
                material.roughnessMap = this.generatedMaps.roughness;
            }
            
            if (this.generatedMaps.displacement && !material.displacementMap) {
                material.displacementMap = this.generatedMaps.displacement;
                material.displacementScale = parseFloat(document.getElementById('displacementStrength').value);
            }
            
            if (this.generatedMaps.ao && !material.aoMap) {
                material.aoMap = this.generatedMaps.ao;
                material.aoMapIntensity = parseFloat(document.getElementById('aoStrength').value);
                
                // Ensure uv2 attribute is set for aoMap
                if (obj.geometry) {
                    obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
                }
            }
            
            if (this.generatedMaps.emissive && !material.emissiveMap) {
                material.emissiveMap = this.generatedMaps.emissive;
                material.emissive = new THREE.Color(0xffffff);
                material.emissiveIntensity = parseFloat(document.getElementById('emissiveStrength').value);
            }
            
            // Apply UV mapping settings to all textures
            this.applyUVSettings();
            
            // Apply the new material
            obj.material.dispose();
            obj.material = material;
            
            // Update UI
            this.updateMaterialControls();
        }
        
        // Handle canvas click for object selection
        handleCanvasClick(event) {
            // Calculate mouse position in normalized device coordinates (-1 to +1)
            const rect = renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update the picking ray
            this.raycaster.setFromCamera(this.mouse, camera);
            
            // Get intersections (ignore helpers and non-mesh objects)
            const intersectables = this.objects
                .filter(obj => obj.visible)
                .map(obj => obj.object);
            
            const intersects = this.raycaster.intersectObjects(intersectables, true);
            
            if (intersects.length > 0) {
                // Find the actual top-level object that was intersected
                let selectedObject = intersects[0].object;
                
                // Navigate up to find parent that is in our object list
                while (selectedObject && !this.objects.some(obj => obj.object === selectedObject)) {
                    selectedObject = selectedObject.parent;
                }
                
                if (selectedObject) {
                    const clickedObj = this.objects.find(obj => obj.object === selectedObject);
                    if (clickedObj) {
                        this.selectObject(clickedObj.id);
                        return;
                    }
                }
            }
            
            // If no object was clicked, deselect current selection
            this.selectObject(null);
        }
        
        // Change the geometry of selected object
        changeGeometry(type) {
            if (!this.selectedObject || this.selectedObject.type.includes('light')) return;
            
            const obj = this.selectedObject.object;
            if (!obj.geometry) return;
            
            // Store current position, rotation, and scale
            const position = obj.position.clone();
            const rotation = obj.rotation.clone();
            const scale = obj.scale.clone();
            const material = obj.material.clone();
            
            // Create new geometry
            let newGeometry;
            
            switch (type) {
                case 'box': 
                    newGeometry = new THREE.BoxGeometry();
                    break;
                case 'sphere': 
                    newGeometry = new THREE.SphereGeometry(0.5, 32, 32);
                    break;
                case 'cylinder': 
                    newGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                    break;
                case 'torus': 
                    newGeometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
                    break;
                case 'plane': 
                    newGeometry = new THREE.PlaneGeometry(1, 1);
                    break;
                default:
                    return;
            }
            
            // Dispose of old geometry
            obj.geometry.dispose();
            
            // Apply new geometry
            obj.geometry = newGeometry;
            
            // Restore position, rotation, and scale
            obj.position.copy(position);
            obj.rotation.copy(rotation);
            obj.scale.copy(scale);
            
            // Set up uv2 coordinates for AO map if applicable
            if (obj.material.aoMap) {
                obj.geometry.setAttribute('uv2', obj.geometry.attributes.uv);
            }
            
            updateSceneInfo(`Changed geometry to ${type}`, false, 'success');
        }

        // Update HDR Environment functions
        loadHDREnvironment(file) {
            if (!file) {
                updateSceneInfo("No HDR file selected", true);
                return;
            }
            
            try {
                const url = URL.createObjectURL(file);
                
                updateSceneInfo("Loading HDR environment...");

                // Store information about the HDR file
                this.hdrFileName = file.name;
                
                // Enable delete button
                const deleteHdrBtn = document.getElementById('deleteHdr');
                if (deleteHdrBtn) {
                    deleteHdrBtn.disabled = false;
                }
                
                rgbeLoader.load(
                    url, 
                    (texture) => {
                        texture.mapping = THREE.EquirectangularReflectionMapping;
                        scene.environment = texture;
                        scene.background = texture;
                        
                        // Update all materials to use environment map
                        this.objects.forEach(obj => {
                            if (obj.object.material && !obj.type.includes('light')) {
                                obj.object.material.envMap = texture;
                                obj.object.material.needsUpdate = true;
                            }
                        });
                        
                        // Create a preview element
                        this.updateHdrPreview(texture, this.hdrFileName);
                        
                        // Mark HDR as loaded
                        this.hdrLoaded = true;
                        
                        // Clean up URL
                        URL.revokeObjectURL(url);
                        
                        updateSceneInfo('HDR environment loaded', false, 'success');
                    },
                    // Progress callback
                    (xhr) => {
                        const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
                        updateSceneInfo(`Loading HDR: ${percent}%`);
                    },
                    // Error callback
                    (error) => {
                        console.error('Error loading HDR:', error);
                        updateSceneInfo('Error loading HDR environment', true);
                        URL.revokeObjectURL(url);
                        this.hdrLoaded = false;
                        this.hdrFileName = null;
                    }
                );
            } catch (error) {
                console.error('Error creating HDR environment:', error);
                updateSceneInfo('Error loading HDR environment', true);
                this.hdrLoaded = false;
                this.hdrFileName = null;
            }
        }

        // Create a preview of the HDR environment
        updateHdrPreview(texture, fileName) {
            const hdrPreview = document.getElementById('hdrPreview');
            if (!hdrPreview) return;
            
            // Clear existing content
            hdrPreview.innerHTML = '';
            
            // Create status element
            const statusEl = document.createElement('p');
            statusEl.className = 'hdr-status';
            statusEl.textContent = `Loaded: ${fileName}`;
            
            // Add preview
            hdrPreview.appendChild(statusEl);
        }

        // Remove HDR environment
        removeHDREnvironment() {
            if (!this.hdrLoaded) {
                updateSceneInfo("No HDR environment loaded", true);
                return;
            }
            
            // Reset scene environment
            scene.environment = null;
            scene.background = new THREE.Color(0x0c0c0c); // Reset to dark background
            
            // Update materials
            this.objects.forEach(obj => {
                if (obj.object.material && !obj.type.includes('light')) {
                    obj.object.material.envMap = null;
                    obj.object.material.needsUpdate = true;
                }
            });
            
            // Update UI
            const hdrPreview = document.getElementById('hdrPreview');
            if (hdrPreview) {
                hdrPreview.innerHTML = '<p class="hdr-status">No HDR Map loaded</p>';
            }
            
            // Disable delete button
            const deleteHdrBtn = document.getElementById('deleteHdr');
            if (deleteHdrBtn) {
                deleteHdrBtn.disabled = true;
            }
            
            // Reset state
            this.hdrLoaded = false;
            this.hdrFileName = null;
            
            updateSceneInfo("HDR environment removed", false, 'success');
        }
    }

    // Initialize scene, renderer, camera, and controls
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0c0c); // Darker background for dark theme

    // Get canvas element
    const canvas = document.getElementById('three-canvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // Renderer setup with antialiasing and shadows
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: canvas
    });
    renderer.setSize(window.innerWidth - 320, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Camera setup
    const aspectRatio = (window.innerWidth - 320) / window.innerHeight;
    const perspectiveCamera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    const orthographicCamera = new THREE.OrthographicCamera(
        -5 * aspectRatio, 5 * aspectRatio, 
        5, -5, 0.1, 1000
    );

    // Set initial camera position and target
    let camera = perspectiveCamera;
    camera.position.set(0, 2, 5);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    camera.lookAt(cameraTarget);

    // Update scene info function with error handling and success option
    function updateSceneInfo(text, isError = false, type = 'info') {
        const infoEl = document.getElementById('scene-info');
        if (infoEl) {
            infoEl.textContent = text;
            
            // Remove all state classes
            infoEl.classList.remove('animate-fade-in', 'error', 'success');
            
            // Add appropriate class
            if (isError) {
                infoEl.classList.add('error');
            } else if (type === 'success') {
                infoEl.classList.add('success');
            }
            
            // Add animation
            void infoEl.offsetWidth; // Trigger reflow to restart animation
            infoEl.classList.add('animate-fade-in');
            
            // Auto-hide after 3 seconds for success messages
            if (type === 'success') {
                setTimeout(() => {
                    infoEl.classList.remove('success');
                    infoEl.textContent = 'Click on objects to select them';
                }, 3000);
            }
        } else {
            console.warn('Scene info element not found');
        }
    }
    
    // Show notification function
    function showNotification(message, type = 'info') {
        const notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) return;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Create icon based on type
        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        let iconClass = 'fa-info-circle';
        
        if (type === 'success') {
            iconClass = 'fa-check-circle';
        } else if (type === 'error') {
            iconClass = 'fa-exclamation-circle';
        } else if (type === 'warning') {
            iconClass = 'fa-exclamation-triangle';
        }
        
        icon.innerHTML = `<i class="fas ${iconClass}"></i>`;
        
        // Create content
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const title = document.createElement('div');
        title.className = 'notification-title';
        title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        
        const messageEl = document.createElement('div');
        messageEl.className = 'notification-message';
        messageEl.textContent = message;
        
        content.appendChild(title);
        content.appendChild(messageEl);
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Assemble notification
        notification.appendChild(icon);
        notification.appendChild(content);
        notification.appendChild(closeBtn);
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    // Show processing indicator function
    function showProcessingIndicator(message, progress = 0) {
        const indicator = document.getElementById('processingIndicator');
        const progressBar = document.getElementById('progressBar');
        const messageEl = document.getElementById('processingMessage');
        
        if (indicator && progressBar && messageEl) {
            messageEl.textContent = message;
            progressBar.style.width = `${progress}%`;
            indicator.style.display = 'flex';
        }
    }
    
    // Update processing progress function
    function updateProcessingProgress(progress) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
    
    // Update processing message function
    function updateProcessingMessage(message) {
        const messageEl = document.getElementById('processingMessage');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
    
    // Hide processing indicator function
    function hideProcessingIndicator() {
        const indicator = document.getElementById('processingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Create scene manager
    const sceneManager = new SceneManager();

    // Orbit controls for camera
    const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;

    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Add directional light to the scene manager
    sceneManager.addLight(directionalLight, 'Main Directional Light', 'light-directional');

    // Create grid helper (visible in scene)
    const gridSize = 20;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Create transparent ground plane
    const groundGeometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.2,
        wireframe: false
    });

    // Add a simple texture for the grid
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    groundMaterial.map = groundTexture;
    groundMaterial.map.repeat.set(gridSize, gridSize);
    groundMaterial.map.wrapS = THREE.RepeatWrapping;
    groundMaterial.map.wrapT = THREE.RepeatWrapping;

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add a cube as initial object
    const boxGeometry = new THREE.BoxGeometry();
    const boxMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3d7eff, // Use theme color
        metalness: 0,
        roughness: 1
    });
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    scene.add(boxMesh);
    
    // Add it to scene manager
    const boxObj = sceneManager.addObject(boxMesh, 'Box');
    
    // RGBELoader for HDR environment maps
    const rgbeLoader = new THREE.RGBELoader();
    
    // Function to handle tab switching
    function setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        if (!tabBtns.length) {
            console.warn('No tab buttons found');
            return;
        }
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs and tab content
                tabBtns.forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                btn.classList.add('active');
                
                // Show corresponding tab content
                const tabId = btn.dataset.tab;
                const tabContent = document.getElementById(`${tabId}-tab`);
                if (tabContent) {
                    tabContent.classList.add('active');
                } else {
                    console.warn(`Tab content for ${tabId} not found`);
                }
            });
        });
    }
    
    // Create event listeners with proper error handling
    function setupEventListeners() {
        try {
            // Canvas click event for object selection
            if (renderer && renderer.domElement) {
                renderer.domElement.addEventListener('click', (event) => {
                    sceneManager.handleCanvasClick(event);
                });
            } else {
                console.warn('Renderer or domElement not available for click events');
            }
            
            // Object creation
            const addObjectBtn = document.getElementById('addObject');
            const confirmAddObjectBtn = document.getElementById('confirmAddObject');
            const geometrySelector = document.getElementById('geometrySelector');
            const addObjectType = document.querySelector('.add-object-type');
            
            if (addObjectBtn && addObjectType) {
                addObjectBtn.addEventListener('click', () => {
                    addObjectType.style.display = 'block';
                });
                
                if (confirmAddObjectBtn && geometrySelector) {
                    confirmAddObjectBtn.addEventListener('click', () => {
                        const type = geometrySelector.value;
                        createNewObject(type);
                        addObjectType.style.display = 'none';
                    });
                } else {
                    console.warn('Confirm add object button or geometry selector not found');
                }
            } else {
                console.warn('Add object button or add object type container not found');
            }
            
            // Import model button
            const importModelBtn = document.getElementById('importModelBtn');
            const importModel = document.getElementById('importModel');
            
            if (importModelBtn && importModel) {
                importModelBtn.addEventListener('click', () => {
                    importModel.click();
                });
                
                importModel.addEventListener('change', handleModelImport);
            } else {
                console.warn('Import model button or file input not found');
            }
            
            // PBR Texture Generator events
            setupTextureGeneratorEvents();
            
            // Add texture button
            const addTextureBtn = document.getElementById('addTexture');
            if (addTextureBtn) {
                addTextureBtn.addEventListener('click', () => {
                    if (!sceneManager.selectedObject) {
                        updateSceneInfo('Please select an object first', true);
                        return;
                    }
                    
                    // Create a file input for texture upload
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.style.display = 'none';
                    document.body.appendChild(input);
                    
                    input.addEventListener('change', (e) => {
                        if (e.target.files.length) {
                            sceneManager.addTexture(e.target.files[0]);
                        }
                        document.body.removeChild(input);
                    });
                    
                    input.click();
                });
            } else {
                console.warn('Add texture button not found');
            }
            
            // HDR environment map upload and delete
            const hdrUpload = document.getElementById('hdrUpload');
            const deleteHdrBtn = document.getElementById('deleteHdr');
            
            if (hdrUpload) {
                hdrUpload.addEventListener('change', (e) => {
                    if (e.target.files.length) {
                        sceneManager.loadHDREnvironment(e.target.files[0]);
                    }
                });
            } else {
                console.warn('HDR upload input not found');
            }
            
            if (deleteHdrBtn) {
                deleteHdrBtn.addEventListener('click', () => {
                    sceneManager.removeHDREnvironment();
                });
            } else {
                console.warn('Delete HDR button not found');
            }
            
            // Change geometry type
            const changeGeometryType = document.getElementById('changeGeometryType');
            if (changeGeometryType) {
                changeGeometryType.addEventListener('change', (e) => {
                    if (sceneManager.selectedObject && !sceneManager.selectedObject.type.includes('light')) {
                        sceneManager.changeGeometry(e.target.value);
                    }
                });
            } else {
                console.warn('Change geometry type selector not found');
            }
            
            // Set up other control events
            setupControlEvents();
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            updateSceneInfo('Error setting up application controls', true);
        }
    }
    
    // Setup PBR Texture Generator specific events
    function setupTextureGeneratorEvents() {
        // Texture upload area
        const textureUploadArea = document.getElementById('textureUploadArea');
        const textureUploadInput = document.getElementById('textureUploadInput');
        const deleteTextureBtn = document.getElementById('deleteTextureBtn');
        
        if (textureUploadArea && textureUploadInput) {
            // Handle click on upload area
            textureUploadArea.addEventListener('click', () => {
                if (textureUploadInput) {
                    textureUploadInput.click();
                }
            });
            
            // Handle file selection
            textureUploadInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    sceneManager.processTextureForPBR(e.target.files[0]);
                }
            });
            
            // Handle drag and drop
            textureUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                textureUploadArea.classList.add('drag-active');
            });
            
            textureUploadArea.addEventListener('dragleave', () => {
                textureUploadArea.classList.remove('drag-active');
            });
            
            textureUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                textureUploadArea.classList.remove('drag-active');
                
                if (e.dataTransfer.files.length) {
                    sceneManager.processTextureForPBR(e.dataTransfer.files[0]);
                }
            });
            
            // Handle delete button
            if (deleteTextureBtn) {
                deleteTextureBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Reset upload area
                    const previewOverlay = document.getElementById('texturePreviewOverlay');
                    const uploadedImg = document.getElementById('uploadedTextureImg');
                    
                    if (previewOverlay) {
                        previewOverlay.style.display = 'none';
                    }
                    
                    if (uploadedImg) {
                        uploadedImg.src = '';
                    }
                    
                    // Clear generated maps
                    for (const key in sceneManager.generatedMaps) {
                        if (sceneManager.generatedMaps[key]) {
                            sceneManager.generatedMaps[key].dispose();
                            sceneManager.generatedMaps[key] = null;
                        }
                    }
                    
                    // Clear canvases
                    for (const key in sceneManager.mapCanvases) {
                        const canvas = sceneManager.mapCanvases[key];
                        if (canvas) {
                            const ctx = canvas.getContext('2d');
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                    }
                    
                    // Reset original image data
                    sceneManager.originalImageData = null;
                    
                    // If there's a selected material, remove the textures
                    if (sceneManager.selectedObject && sceneManager.selectedObject.object.material) {
                        const material = sceneManager.selectedObject.object.material;
                        
                        material.map = null;
                        material.normalMap = null;
                        material.roughnessMap = null;
                        material.displacementMap = null;
                        material.aoMap = null;
                        material.emissiveMap = null;
                        
                        material.needsUpdate = true;
                    }
                    
                    showNotification('Texture removed', 'info');
                });
            }
        }
        
        // Smart enhance button
        const smartEnhanceBtn = document.getElementById('smartEnhance');
        if (smartEnhanceBtn) {
            smartEnhanceBtn.addEventListener('click', () => {
                sceneManager.smartEnhanceTextures();
            });
        }
        
        // Map strength sliders
        const normalStrength = document.getElementById('normalStrength');
        const roughnessStrength = document.getElementById('roughnessStrength');
        const displacementStrength = document.getElementById('displacementStrength');
        const aoStrength = document.getElementById('aoStrength');
        const emissiveStrength = document.getElementById('emissiveStrength');
        
        if (normalStrength) {
            normalStrength.addEventListener('input', () => {
                sceneManager.updateMapStrength('normal');
            });
        }
        
        if (roughnessStrength) {
            roughnessStrength.addEventListener('input', () => {
                sceneManager.updateMapStrength('roughness');
            });
        }
        
        if (displacementStrength) {
            displacementStrength.addEventListener('input', () => {
                sceneManager.updateMapStrength('displacement');
            });
        }
        
        if (aoStrength) {
            aoStrength.addEventListener('input', () => {
                sceneManager.updateMapStrength('ao');
            });
        }
        
        if (emissiveStrength) {
            emissiveStrength.addEventListener('input', () => {
                sceneManager.updateMapStrength('emissive');
            });
        }
        
        // UV mapping controls
        const uvTilingX = document.getElementById('uvTilingX');
        const uvTilingY = document.getElementById('uvTilingY');
        const uvOffsetX = document.getElementById('uvOffsetX');
        const uvOffsetY = document.getElementById('uvOffsetY');
        const uvRotation = document.getElementById('uvRotation');
        
        const updateUV = () => {
            sceneManager.applyUVSettings();
        };
        
        if (uvTilingX) uvTilingX.addEventListener('input', updateUV);
        if (uvTilingY) uvTilingY.addEventListener('input', updateUV);
        if (uvOffsetX) uvOffsetX.addEventListener('input', updateUV);
        if (uvOffsetY) uvOffsetY.addEventListener('input', updateUV);
        if (uvRotation) uvRotation.addEventListener('input', updateUV);
        
        // Download map buttons
        const downloadBaseColor = document.getElementById('downloadBaseColor');
        const downloadNormal = document.getElementById('downloadNormal');
        const downloadRoughness = document.getElementById('downloadRoughness');
        const downloadDisplacement = document.getElementById('downloadDisplacement');
        const downloadAO = document.getElementById('downloadAO');
        const downloadEmissive = document.getElementById('downloadEmissive');
        
        if (downloadBaseColor) {
            downloadBaseColor.addEventListener('click', () => {
                sceneManager.downloadMap('baseColor');
            });
        }
        
        if (downloadNormal) {
            downloadNormal.addEventListener('click', () => {
                sceneManager.downloadMap('normal');
            });
        }
        
        if (downloadRoughness) {
            downloadRoughness.addEventListener('click', () => {
                sceneManager.downloadMap('roughness');
            });
        }
        
        if (downloadDisplacement) {
            downloadDisplacement.addEventListener('click', () => {
                sceneManager.downloadMap('displacement');
            });
        }
        
        if (downloadAO) {
            downloadAO.addEventListener('click', () => {
                sceneManager.downloadMap('ao');
            });
        }
        
        if (downloadEmissive) {
            downloadEmissive.addEventListener('click', () => {
                sceneManager.downloadMap('emissive');
            });
        }
        
        // Export maps button
        const exportMapsBtn = document.getElementById('exportMaps');
        const exportZIPBtn = document.getElementById('exportZIP');
        const cancelExportBtn = document.getElementById('cancelExport');
        
        if (exportMapsBtn) {
            exportMapsBtn.addEventListener('click', () => {
                // Show export options panel
                const exportOptions = document.querySelector('.export-options');
                if (exportOptions) {
                    exportOptions.style.display = 'block';
                }
            });
        }
        
        if (exportZIPBtn) {
            exportZIPBtn.addEventListener('click', () => {
                sceneManager.exportMapsAsZip();
            });
        }
        
        if (cancelExportBtn) {
            cancelExportBtn.addEventListener('click', () => {
                // Hide export options panel
                const exportOptions = document.querySelector('.export-options');
                if (exportOptions) {
                    exportOptions.style.display = 'none';
                }
            });
        }
    }
    
    // Function to set up control event listeners with error handling
    function setupControlEvents() {
        try {
            // Material controls
            const objectColor = document.getElementById('objectColor');
            const metalness = document.getElementById('metalness');
            const roughness = document.getElementById('roughness');
            const wireframe = document.getElementById('wireframe');
            
            if (objectColor) {
                objectColor.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject) return;
                    if (sceneManager.selectedObject.object.material) {
                        sceneManager.selectedObject.object.material.color.set(e.target.value);
                    }
                });
            }
            
            if (metalness) {
                metalness.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject) return;
                    if (sceneManager.selectedObject.object.material) {
                        sceneManager.selectedObject.object.material.metalness = parseFloat(e.target.value);
                    }
                });
            }
            
            if (roughness) {
                roughness.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject) return;
                    if (sceneManager.selectedObject.object.material) {
                        sceneManager.selectedObject.object.material.roughness = parseFloat(e.target.value);
                    }
                });
            }
            
            if (wireframe) {
                wireframe.addEventListener('change', (e) => {
                    if (!sceneManager.selectedObject) return;
                    if (sceneManager.selectedObject.object.material) {
                        sceneManager.selectedObject.object.material.wireframe = e.target.checked;
                    }
                });
            }
            
            // Position, rotation, scale controls
            ['X', 'Y', 'Z'].forEach(axis => {
                const positionInput = document.getElementById(`position${axis}`);
                const rotateInput = document.getElementById(`rotate${axis}`);
                const scaleInput = document.getElementById(`scale${axis}`);
                
                if (positionInput) {
                    positionInput.addEventListener('input', (e) => {
                        if (!sceneManager.selectedObject) return;
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            sceneManager.selectedObject.object.position[axis.toLowerCase()] = value;
                        }
                    });
                }
                
                if (rotateInput) {
                    rotateInput.addEventListener('input', (e) => {
                        if (!sceneManager.selectedObject) return;
                        const valueDegrees = parseFloat(e.target.value);
                        if (!isNaN(valueDegrees)) {
                            // Convert degrees to radians for Three.js
                            const valueRadians = valueDegrees * (Math.PI/180);
                            sceneManager.selectedObject.object.rotation[axis.toLowerCase()] = valueRadians;
                        }
                    });
                }
                
                if (scaleInput) {
                    scaleInput.addEventListener('input', (e) => {
                        if (!sceneManager.selectedObject) return;
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value > 0) {
                            sceneManager.selectedObject.object.scale[axis.toLowerCase()] = value;
                        }
                    });
                }
            });
            
            // Light controls
            const lightIntensity = document.getElementById('lightIntensity');
            const lightColor = document.getElementById('lightColor');
            const lightDistance = document.getElementById('lightDistance');
            const lightCastShadow = document.getElementById('lightCastShadow');
            const lightAngle = document.getElementById('lightAngle');
            const lightPenumbra = document.getElementById('lightPenumbra');
            
            if (lightIntensity) {
                lightIntensity.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || !sceneManager.selectedObject.type.includes('light')) return;
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                        sceneManager.selectedObject.object.intensity = value;
                    }
                });
            }
            
            if (lightColor) {
                lightColor.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || !sceneManager.selectedObject.type.includes('light')) return;
                    sceneManager.selectedObject.object.color.set(e.target.value);
                    sceneManager.updateLightsPanel();
                });
            }
            
            if (lightDistance) {
                lightDistance.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || !sceneManager.selectedObject.type.includes('light')) return;
                    if (sceneManager.selectedObject.object.distance !== undefined) {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            sceneManager.selectedObject.object.distance = value;
                        }
                    }
                });
            }
            
            if (lightCastShadow) {
                lightCastShadow.addEventListener('change', (e) => {
                    if (!sceneManager.selectedObject || !sceneManager.selectedObject.type.includes('light')) return;
                    if (sceneManager.selectedObject.object.castShadow !== undefined) {
                        sceneManager.selectedObject.object.castShadow = e.target.checked;
                    }
                });
            }
            
            if (lightAngle) {
                lightAngle.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || sceneManager.selectedObject.type !== 'light-spot') return;
                    const valueDegrees = parseFloat(e.target.value);
                    if (!isNaN(valueDegrees)) {
                        const valueRadians = THREE.MathUtils.degToRad(valueDegrees);
                        sceneManager.selectedObject.object.angle = valueRadians;
                    }
                });
            }
            
            if (lightPenumbra) {
                lightPenumbra.addEventListener('input', (e) => {
                    if (!sceneManager.selectedObject || sceneManager.selectedObject.type !== 'light-spot') return;
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                        sceneManager.selectedObject.object.penumbra = value;
                    }
                });
            }
            
            // Camera type toggle
            const cameraType = document.getElementById('cameraType');
            if (cameraType) {
                cameraType.addEventListener('change', (e) => {
                    if (e.target.value === 'perspective') {
                        camera = perspectiveCamera;
                    } else {
                        camera = orthographicCamera;
                    }
                    
                    // Update camera position and controls
                    camera.position.copy(orbitControls.object.position);
                    camera.lookAt(cameraTarget);
                    orbitControls.object = camera;
                    
                    updateSceneInfo(`Switched to ${e.target.value} camera`, false, 'success');
                });
            }
            
            // Camera controls
            ['X', 'Y', 'Z'].forEach(axis => {
                const cameraInput = document.getElementById(`camera${axis}`);
                const targetInput = document.getElementById(`target${axis}`);
                
                if (cameraInput) {
                    cameraInput.addEventListener('input', (e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            camera.position[axis.toLowerCase()] = value;
                            orbitControls.update();
                        }
                    });
                }
                
                if (targetInput) {
                    targetInput.addEventListener('input', (e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            cameraTarget[axis.toLowerCase()] = value;
                            camera.lookAt(cameraTarget);
                            orbitControls.target.copy(cameraTarget);
                            orbitControls.update();
                        }
                    });
                }
            });
            
            // Fog controls
            const fogToggle = document.getElementById('fog');
            const fogDensity = document.getElementById('fogDensity');
            const fogColor = document.getElementById('fogColor');
            
            if (fogToggle) {
                fogToggle.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        const density = fogDensity ? parseFloat(fogDensity.value) : 0.01;
                        const color = fogColor ? new THREE.Color(fogColor.value) : new THREE.Color(0x111111);
                        scene.fog = new THREE.FogExp2(color, density);
                    } else {
                        scene.fog = null;
                    }
                });
            }
            
            if (fogDensity) {
                fogDensity.addEventListener('input', (e) => {
                    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
                        scene.fog.density = parseFloat(e.target.value);
                    }
                });
            }
            
            if (fogColor) {
                fogColor.addEventListener('input', (e) => {
                    if (scene.fog) {
                        scene.fog.color.set(e.target.value);
                    }
                });
            }
            
            // Grid and ground controls
            const showGrid = document.getElementById('showGrid');
            const showGroundPlane = document.getElementById('showGroundPlane');
            const gridSizeInput = document.getElementById('gridSize');
            const gridDivisionsInput = document.getElementById('gridDivisions');
            
            if (showGrid) {
                showGrid.addEventListener('change', (e) => {
                    gridHelper.visible = e.target.checked;
                });
            }
            
            if (showGroundPlane) {
                showGroundPlane.addEventListener('change', (e) => {
                    ground.visible = e.target.checked;
                });
            }
            
            // Ambient light controls
            const ambientIntensity = document.getElementById('ambientIntensity');
            const ambientColor = document.getElementById('ambientColor');
            
            if (ambientIntensity) {
                ambientIntensity.addEventListener('input', (e) => {
                    ambientLight.intensity = parseFloat(e.target.value);
                });
            }
            
            if (ambientColor) {
                ambientColor.addEventListener('input', (e) => {
                    ambientLight.color.set(e.target.value);
                });
            }
            
            // Shadow controls
            const enableShadows = document.getElementById('enableShadows');
            const shadowQuality = document.getElementById('shadowQuality');
            
            if (enableShadows) {
                enableShadows.addEventListener('change', (e) => {
                    renderer.shadowMap.enabled = e.target.checked;
                    
                    // Update all objects to match shadow setting
                    sceneManager.objects.forEach(obj => {
                        if (obj.object.isMesh) {
                            obj.object.castShadow = e.target.checked;
                            obj.object.receiveShadow = e.target.checked;
                        } else if (obj.type.includes('light')) {
                            if (obj.object.castShadow !== undefined) {
                                obj.object.castShadow = e.target.checked;
                            }
                        }
                    });
                });
            }
            
            if (shadowQuality) {
                shadowQuality.addEventListener('change', (e) => {
                    let mapSize;
                    switch (e.target.value) {
                        case 'low':
                            mapSize = 512;
                            break;
                        case 'medium':
                            mapSize = 1024;
                            break;
                        case 'high':
                            mapSize = 2048;
                            break;
                        default:
                            mapSize = 1024;
                    }
                    
                    // Update shadow map quality for all lights
                    sceneManager.lights.forEach(light => {
                        if (light.object.shadow) {
                            light.object.shadow.mapSize.width = mapSize;
                            light.object.shadow.mapSize.height = mapSize;
                        }
                    });
                    
                    updateSceneInfo(`Shadow quality set to ${e.target.value}`, false, 'success');
                });
            }
            
            // Environment map intensity
            const envMapIntensity = document.getElementById('envMapIntensity');
            if (envMapIntensity) {
                envMapIntensity.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                        // Apply to all materials
                        sceneManager.objects.forEach(obj => {
                            if (obj.object.material && !obj.type.includes('light')) {
                                obj.object.material.envMapIntensity = value;
                            }
                        });
                    }
                });
            }
            
            // Export buttons
            const exportSceneBtn = document.getElementById('exportScene');
            const copyCodeBtn = document.getElementById('copyCode');
            
            if (exportSceneBtn) {
                exportSceneBtn.addEventListener('click', exportScene);
            } else {
                console.warn('Export scene button not found');
            }
            
            if (copyCodeBtn) {
                copyCodeBtn.addEventListener('click', generateAndCopyCode);
            } else {
                console.warn('Copy code button not found');
            }
            
        } catch (error) {
            console.error('Error setting up control events:', error);
            updateSceneInfo('Error setting up control events', true);
        }
    }
    
    // Function to create a new object
    function createNewObject(type) {
        try {
            let object;
            
            if (type.startsWith('light-')) {
                // Create a light
                switch (type) {
                    case 'light-point':
                        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
                        pointLight.position.set(0, 2, 0);
                        pointLight.castShadow = true;
                        object = pointLight;
                        scene.add(object);
                        sceneManager.addLight(object, 'Point Light', 'light-point');
                        break;
                    case 'light-spot':
                        const spotLight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI/4, 0.2);
                        spotLight.position.set(0, 5, 0);
                        spotLight.castShadow = true;
                        object = spotLight;
                        scene.add(object);
                        sceneManager.addLight(object, 'Spot Light', 'light-spot');
                        break;
                    case 'light-area':
                        // Three.js doesn't have an area light in the core library,
                        // but we can simulate it with a DirectionalLight
                        const rectLight = new THREE.DirectionalLight(0xffffff, 1);
                        rectLight.position.set(0, 5, 0);
                        rectLight.castShadow = true;
                        object = rectLight;
                        scene.add(object);
                        sceneManager.addLight(object, 'Directional Light', 'light-area');
                        break;
                }
                
                updateSceneInfo(`Added new ${type.replace('light-', '')} light`, false, 'success');
            } else {
                // Create a mesh
                let geometry;
                
                switch (type) {
                    case 'box': 
                        geometry = new THREE.BoxGeometry();
                        break;
                    case 'sphere': 
                        geometry = new THREE.SphereGeometry(0.5, 32, 32);
                        break;
                    case 'cylinder': 
                        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
                        break;
                    case 'torus': 
                        geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);
                        break;
                    case 'plane': 
                        geometry = new THREE.PlaneGeometry(1, 1);
                        break;
                    default:
                        geometry = new THREE.BoxGeometry();
                }
                
                const material = new THREE.MeshStandardMaterial({
                    color: 0x3d7eff, // Use theme color
                    metalness: 0,
                    roughness: 1
                });
                
                object = new THREE.Mesh(geometry, material);
                object.castShadow = true;
                object.receiveShadow = true;
                
                scene.add(object);
                
                // Add to scene manager
                const objData = sceneManager.addObject(
                    object, 
                    type.charAt(0).toUpperCase() + type.slice(1)
                );
                
                // Select the new object
                sceneManager.selectObject(objData.id);
                
                updateSceneInfo(`Added new ${type}`, false, 'success');
            }
            
            return object;
        } catch (error) {
            console.error('Error creating new object:', error);
            updateSceneInfo(`Error creating ${type}`, true);
            return null;
        }
    }
    
    // Function to handle model import
    function handleModelImport(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            updateSceneInfo(`Importing model: ${file.name}...`);
            
            const url = URL.createObjectURL(file);
            
            // Create GLTF loader
            const gltfLoader = new THREE.GLTFLoader();
            
            gltfLoader.load(url, 
                // Success callback
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Center the model
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);
                    
                    // Normalize scale
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    if (maxDim > 2) {
                        const scale = 2 / maxDim;
                        model.scale.set(scale, scale, scale);
                    }
                    
                    // Apply shadows
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    
                    scene.add(model);
                    
                    // Add to scene manager
                    const objData = sceneManager.addObject(
                        model, 
                        file.name.split('.')[0] || 'Imported Model'
                    );
                    
                    // Select the new model
                    sceneManager.selectObject(objData.id);
                    
                    // Clean up URL
                    URL.revokeObjectURL(url);
                    
                    updateSceneInfo(`Model ${file.name} imported successfully`, false, 'success');
                }, 
                // Progress callback
                (xhr) => {
                    const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
                    updateSceneInfo(`Loading model: ${percent}%`);
                },
                // Error callback
                (error) => {
                    console.error('Error loading model:', error);
                    updateSceneInfo('Error loading model', true);
                    URL.revokeObjectURL(url);
                }
            );
            
            // Reset file input
            event.target.value = '';
        } catch (error) {
            console.error('Error handling model import:', error);
            updateSceneInfo('Error importing model', true);
        }
    }
    
    // Function to export scene as JSON
    function exportScene() {
        try {
            const sceneJson = scene.toJSON();
            const jsonString = JSON.stringify(sceneJson, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scene.json';
            a.click();
            
            URL.revokeObjectURL(url);
            
            updateSceneInfo('Scene exported as JSON', false, 'success');
        } catch (error) {
            console.error('Error exporting scene:', error);
            updateSceneInfo('Error exporting scene', true);
        }
    }
    
    // Function to generate and copy Three.js code
    function generateAndCopyCode() {
        try {
            // Generate code for scene setup
            let code = `// Three.js Scene exported from 3D Scene Editor\n\n`;
            code += `// Create scene\n`;
            code += `const scene = new THREE.Scene();\n`;
            code += `scene.background = new THREE.Color(0x${scene.background.getHexString()});\n\n`;
            
            // Add renderer code
            code += `// Renderer setup\n`;
            code += `const renderer = new THREE.WebGLRenderer({ antialias: true });\n`;
            code += `renderer.setSize(window.innerWidth, window.innerHeight);\n`;
            code += `renderer.setPixelRatio(window.devicePixelRatio);\n`;
            code += `renderer.shadowMap.enabled = ${renderer.shadowMap.enabled};\n`;
            code += `renderer.shadowMap.type = THREE.PCFSoftShadowMap;\n`;
            code += `renderer.toneMapping = THREE.ACESFilmicToneMapping;\n`;
            code += `renderer.toneMappingExposure = 1;\n`;
            code += `document.body.appendChild(renderer.domElement);\n\n`;
            
            // Add camera code
            code += `// Camera setup\n`;
            if (camera === perspectiveCamera) {
                code += `const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);\n`;
            } else {
                code += `const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);\n`;
            }
            code += `camera.position.set(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)});\n`;
            code += `camera.lookAt(${cameraTarget.x.toFixed(2)}, ${cameraTarget.y.toFixed(2)}, ${cameraTarget.z.toFixed(2)});\n\n`;
            
            // Add orbit controls
            code += `// Orbit controls\n`;
            code += `const controls = new THREE.OrbitControls(camera, renderer.domElement);\n`;
            code += `controls.enableDamping = true;\n`;
            code += `controls.dampingFactor = 0.05;\n\n`;
            
            // Add ambient light
            code += `// Ambient light\n`;
            code += `const ambientLight = new THREE.AmbientLight(0x${ambientLight.color.getHexString()}, ${ambientLight.intensity});\n`;
            code += `scene.add(ambientLight);\n\n`;
            
            // Add all other objects
            code += `// Scene objects\n`;
            sceneManager.objects.forEach(obj => {
                if (obj.type.includes('light')) {
                    // Add light code
                    const light = obj.object;
                    
                    code += `// ${obj.name}\n`;
                    if (obj.type === 'light-directional') {
                        code += `const ${obj.id} = new THREE.DirectionalLight(0x${light.color.getHexString()}, ${light.intensity});\n`;
                    } else if (obj.type === 'light-point') {
                        code += `const ${obj.id} = new THREE.PointLight(0x${light.color.getHexString()}, ${light.intensity}, ${light.distance});\n`;
                    } else if (obj.type === 'light-spot') {
                        code += `const ${obj.id} = new THREE.SpotLight(0x${light.color.getHexString()}, ${light.intensity}, ${light.distance}, ${light.angle.toFixed(4)}, ${light.penumbra});\n`;
                    }
                    
                    code += `${obj.id}.position.set(${light.position.x.toFixed(2)}, ${light.position.y.toFixed(2)}, ${light.position.z.toFixed(2)});\n`;
                    
                    if (light.castShadow) {
                        code += `${obj.id}.castShadow = true;\n`;
                        if (light.shadow) {
                            code += `${obj.id}.shadow.mapSize.width = ${light.shadow.mapSize.width};\n`;
                            code += `${obj.id}.shadow.mapSize.height = ${light.shadow.mapSize.height};\n`;
                        }
                    }
                    
                    code += `scene.add(${obj.id});\n\n`;
                } else {
                    // Add mesh code
                    const mesh = obj.object;
                    
                    code += `// ${obj.name}\n`;
                    code += `const ${obj.id}_material = new THREE.MeshStandardMaterial({\n`;
                    code += `  color: 0x${mesh.material.color.getHexString()},\n`;
                    code += `  metalness: ${mesh.material.metalness},\n`;
                    code += `  roughness: ${mesh.material.roughness},\n`;
                    
                    if (mesh.material.wireframe) {
                        code += `  wireframe: true,\n`;
                    }
                    
                    code += `});\n`;
                    
                    // Determine geometry type
                    if (mesh.geometry instanceof THREE.BoxGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.BoxGeometry();\n`;
                    } else if (mesh.geometry instanceof THREE.SphereGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.SphereGeometry(0.5, 32, 32);\n`;
                    } else if (mesh.geometry instanceof THREE.CylinderGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);\n`;
                    } else if (mesh.geometry instanceof THREE.TorusGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 32);\n`;
                    } else if (mesh.geometry instanceof THREE.PlaneGeometry) {
                        code += `const ${obj.id}_geometry = new THREE.PlaneGeometry(1, 1);\n`;
                    } else {
                        code += `// Complex or custom geometry\n`;
                        code += `const ${obj.id}_geometry = new THREE.BoxGeometry();\n`;
                    }
                    
                    code += `const ${obj.id} = new THREE.Mesh(${obj.id}_geometry, ${obj.id}_material);\n`;
                    code += `${obj.id}.position.set(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)});\n`;
                    code += `${obj.id}.rotation.set(${mesh.rotation.x.toFixed(4)}, ${mesh.rotation.y.toFixed(4)}, ${mesh.rotation.z.toFixed(4)});\n`;
                    code += `${obj.id}.scale.set(${mesh.scale.x.toFixed(2)}, ${mesh.scale.y.toFixed(2)}, ${mesh.scale.z.toFixed(2)});\n`;
                    
                    if (mesh.castShadow) {
                        code += `${obj.id}.castShadow = true;\n`;
                    }
                    
                    if (mesh.receiveShadow) {
                        code += `${obj.id}.receiveShadow = true;\n`;
                    }
                    
                    code += `scene.add(${obj.id});\n\n`;
                }
            });
            
            // Add animation loop
            code += `// Animation loop\n`;
            code += `function animate() {\n`;
            code += `  requestAnimationFrame(animate);\n`;
            code += `  controls.update();\n`;
            code += `  renderer.render(scene, camera);\n`;
            code += `}\n\n`;
            code += `animate();\n\n`;
            
            // Add window resize handler
            code += `// Window resize handler\n`;
            code += `window.addEventListener('resize', () => {\n`;
            code += `  camera.aspect = window.innerWidth / window.innerHeight;\n`;
            code += `  camera.updateProjectionMatrix();\n`;
            code += `  renderer.setSize(window.innerWidth, window.innerHeight);\n`;
            code += `});\n`;
            
            // Copy to clipboard
            navigator.clipboard.writeText(code)
                .then(() => {
                    updateSceneInfo('Three.js code copied to clipboard!', false, 'success');
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    // Fallback
                    const textarea = document.createElement('textarea');
                    textarea.value = code;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    updateSceneInfo('Three.js code copied to clipboard!', false, 'success');
                });
        } catch (error) {
            console.error('Error generating code:', error);
            updateSceneInfo('Error generating Three.js code', true);
        }
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        orbitControls.update();
        renderer.render(scene, camera);
    }
    
    // Window resize handler
    window.addEventListener('resize', () => {
        const width = window.innerWidth - 320;
        const height = window.innerHeight;
        
        // Update camera aspect ratio and projection matrix
        if (camera === perspectiveCamera) {
            perspectiveCamera.aspect = width / height;
            perspectiveCamera.updateProjectionMatrix();
        } else {
            // Update orthographic camera frustum
            orthographicCamera.left = -5 * (width / height);
            orthographicCamera.right = 5 * (width / height);
            orthographicCamera.updateProjectionMatrix();
        }
        
        // Update renderer size
        renderer.setSize(width, height);
    });
    
    // Set up the UI components
    setupTabs();
    setupEventListeners();
    
    // Select the initial object
    sceneManager.selectObject(boxObj.id);
    
    // Start animation loop
    animate();
    
    // Show ready message
    updateSceneInfo('3D Scene Editor ready. Click on objects to select them');
}
