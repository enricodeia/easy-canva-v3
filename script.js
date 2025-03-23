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
            this.interactionMode = false;
            this.hoveredObject = null;
            this.tooltipVisible = false;
            this.lastUpdateTime = Date.now();
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
                textures: [],
                // Add GLTF animation properties
                gltfAnimations: [],
                mixer: null,
                animationActions: {},
                currentGltfAnimation: null,
                hoverAnimationPlaying: false,
                hoverAnimationName: null,
                // Add interaction properties
                interaction: {
                    type: 'none', // none, hover, click, both
                    hoverEffect: 'none', // none, highlight, scale, color, emissive, animate
                    hoverColor: '#ffcc00',
                    hoverIntensity: 0.5,
                    clickAction: 'none', // none, toggle, animate, url, custom
                    animationType: 'rotate', // rotate, bounce, spin, or gltf:animationName
                    url: '',
                    customFunction: '',
                    tooltip: '',
                    tooltipEnabled: false,
                    // Store original properties to restore after effects
                    originalScale: null,
                    originalColor: null,
                    originalEmissive: null,
                    animating: false
                }
            };
            
            // Store original scale for interaction effects
            if (object.scale) {
                objectData.interaction.originalScale = object.scale.clone();
            }
            
            // Store original color for interaction effects
            if (object.material && object.material.color) {
                objectData.interaction.originalColor = object.material.color.clone();
            }
            
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
                type: type,
                // Add minimal interaction properties for lights
                interaction: {
                    type: 'none',
                    tooltipEnabled: false,
                    tooltip: ''
                }
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
                
                // Clear any hover state if this was the hovered object
                if (this.hoveredObject && this.hoveredObject.id === id) {
                    this.hoveredObject = null;
                    this.hideTooltip();
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
                
                // Update interactivity UI
                this.updateInteractivityUI();
                
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
                // Update interactivity UI
                this.updateInteractivityUI();
                // Update animation UI for GLTF models
                this.updateAnimationUI();
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
                
                // Show animation icon if it has GLTF animations
                if (obj.gltfAnimations && obj.gltfAnimations.length > 0) {
                    nameSpan.textContent = `${obj.name} (${obj.gltfAnimations.length} anim)`;
                }
                
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
        
        // Update animation UI to show GLTF animation options
        updateAnimationUI() {
            if (!this.selectedObject) return;
            
            const obj = this.selectedObject;
            const animations = obj.gltfAnimations || [];
            
            // Only proceed if we have animations or we need to update the controls
            if (animations.length === 0 && 
                (!document.getElementById('animationGroup') || 
                 !document.getElementById('hoverEffect'))) return;
            
            // If we already have animation controls, let's update them
            const animationGroup = document.getElementById('animationGroup');
            if (animationGroup) {
                const animationType = document.getElementById('animationType');
                if (!animationType) return;
                
                // Clear existing options
                animationType.innerHTML = '';
                
                // Add built-in animations
                const builtinOption = document.createElement('optgroup');
                builtinOption.label = 'Built-in Animations';
                
                const rotateOption = document.createElement('option');
                rotateOption.value = 'rotate';
                rotateOption.textContent = 'Rotate';
                builtinOption.appendChild(rotateOption);
                
                const bounceOption = document.createElement('option');
                bounceOption.value = 'bounce';
                bounceOption.textContent = 'Bounce';
                builtinOption.appendChild(bounceOption);
                
                const spinOption = document.createElement('option');
                spinOption.value = 'spin';
                spinOption.textContent = 'Spin';
                builtinOption.appendChild(spinOption);
                
                animationType.appendChild(builtinOption);
                
                // Add GLTF animations if available
                if (animations.length > 0) {
                    const gltfGroup = document.createElement('optgroup');
                    gltfGroup.label = 'GLTF Animations';
                    
                    animations.forEach(anim => {
                        const option = document.createElement('option');
                        option.value = `gltf:${anim.name}`;
                        option.textContent = anim.name;
                        gltfGroup.appendChild(option);
                    });
                    
                    animationType.appendChild(gltfGroup);
                }
                
                // Set current value based on object property
                if (obj.interaction && obj.interaction.animationType) {
                    animationType.value = obj.interaction.animationType;
                }
            }
            
            // Add 'animate' option to hover effect if needed and animations exist
            const hoverEffect = document.getElementById('hoverEffect');
            if (hoverEffect && animations.length > 0) {
                let hasAnimateOption = false;
                for (let i = 0; i < hoverEffect.options.length; i++) {
                    if (hoverEffect.options[i].value === 'animate') {
                        hasAnimateOption = true;
                        break;
                    }
                }
                
                if (!hasAnimateOption) {
                    const option = document.createElement('option');
                    option.value = 'animate';
                    option.textContent = 'Play Animation';
                    hoverEffect.appendChild(option);
                }
            }
        }
        
        // Update the interactivity UI based on selected object
        updateInteractivityUI() {
            // Get UI elements
            const interactionType = document.getElementById('interactionType');
            const hoverEffect = document.getElementById('hoverEffect');
            const hoverColor = document.getElementById('hoverColor');
            const hoverIntensity = document.getElementById('hoverIntensity');
            const hoverIntensityValue = document.getElementById('hoverIntensityValue');
            const clickAction = document.getElementById('clickAction');
            const actionUrl = document.getElementById('actionUrl');
            const animationType = document.getElementById('animationType');
            const customFunction = document.getElementById('customFunction');
            const enableTooltip = document.getElementById('enableTooltip');
            const tooltipContent = document.getElementById('tooltipContent');
            
            // Groups that need to be shown/hidden
            const hoverColorGroup = document.getElementById('hoverColorGroup');
            const hoverIntensityGroup = document.getElementById('hoverIntensityGroup');
            const urlGroup = document.getElementById('urlGroup');
            const animationGroup = document.getElementById('animationGroup');
            const customFunctionGroup = document.getElementById('customFunctionGroup');
            const hoverEffectSection = document.getElementById('hoverEffectSection');
            const clickActionSection = document.getElementById('clickActionSection');
            
            if (!this.selectedObject) {
                // No object selected, disable all interactivity controls
                if (interactionType) interactionType.value = 'none';
                if (hoverEffect) hoverEffect.value = 'none';
                if (clickAction) clickAction.value = 'none';
                if (enableTooltip) enableTooltip.checked = false;
                if (tooltipContent) tooltipContent.value = '';
                
                // Hide conditional sections
                if (hoverColorGroup) hoverColorGroup.style.display = 'none';
                if (hoverIntensityGroup) hoverIntensityGroup.style.display = 'none';
                if (urlGroup) urlGroup.style.display = 'none';
                if (animationGroup) animationGroup.style.display = 'none';
                if (customFunctionGroup) customFunctionGroup.style.display = 'none';
                
                return;
            }
            
            // Update UI with selected object's interaction settings
            const interaction = this.selectedObject.interaction;
            
            if (interactionType) interactionType.value = interaction.type || 'none';
            if (hoverEffect) hoverEffect.value = interaction.hoverEffect || 'none';
            if (hoverColor) hoverColor.value = interaction.hoverColor || '#ffcc00';
            if (hoverIntensity) hoverIntensity.value = interaction.hoverIntensity || 0.5;
            if (hoverIntensityValue) hoverIntensityValue.textContent = parseFloat(interaction.hoverIntensity || 0.5).toFixed(2);
            if (clickAction) clickAction.value = interaction.clickAction || 'none';
            if (actionUrl) actionUrl.value = interaction.url || '';
            if (animationType) animationType.value = interaction.animationType || 'rotate';
            if (customFunction) customFunction.value = interaction.customFunction || '';
            if (enableTooltip) enableTooltip.checked = interaction.tooltipEnabled || false;
            if (tooltipContent) tooltipContent.value = interaction.tooltip || '';
            
            // Show/hide hover effect section based on interaction type
            if (hoverEffectSection) {
                hoverEffectSection.style.display = 
                    (interaction.type === 'hover' || interaction.type === 'both') ? 'block' : 'none';
            }
            
            // Show/hide click action section based on interaction type
            if (clickActionSection) {
                clickActionSection.style.display = 
                    (interaction.type === 'click' || interaction.type === 'both') ? 'block' : 'none';
            }
            
            // Show/hide color picker based on hover effect
            if (hoverColorGroup) {
                hoverColorGroup.style.display = 
                    (interaction.hoverEffect === 'color' || interaction.hoverEffect === 'emissive') ? 'block' : 'none';
            }
            
            // Show/hide intensity slider based on hover effect
            if (hoverIntensityGroup) {
                hoverIntensityGroup.style.display = 
                    (interaction.hoverEffect === 'scale' || interaction.hoverEffect === 'highlight' || 
                     interaction.hoverEffect === 'emissive') ? 'block' : 'none';
            }
            
            // Show/hide URL input based on click action
            if (urlGroup) {
                urlGroup.style.display = interaction.clickAction === 'url' ? 'block' : 'none';
            }
            
            // Show/hide animation type selector based on click action
            if (animationGroup) {
                animationGroup.style.display = interaction.clickAction === 'animate' ? 'block' : 'none';
                
                // Update animation UI for GLTF models
                this.updateAnimationUI();
            }
            
            // Show/hide custom function input based on click action
            if (customFunctionGroup) {
                customFunctionGroup.style.display = interaction.clickAction === 'custom' ? 'block' : 'none';
            }
        }
        
        // Handle hover events in interaction mode
        handleHover(event) {
            if (!this.interactionMode) return;
            
            // Calculate mouse position
            const rect = renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update the picking ray
            this.raycaster.setFromCamera(this.mouse, camera);
            
            // Get intersections with interactive objects
            const interactiveObjects = this.objects
                .filter(obj => obj.visible && obj.interaction && 
                       (obj.interaction.type === 'hover' || obj.interaction.type === 'both'))
                .map(obj => obj.object);
            
            const intersects = this.raycaster.intersectObjects(interactiveObjects, true);
            
            if (intersects.length > 0) {
                // Find the top-level object that was intersected
                let hitObject = intersects[0].object;
                
                // Navigate up to find parent in our object list
                while (hitObject && !this.objects.some(obj => obj.object === hitObject)) {
                    hitObject = hitObject.parent;
                }
                
                const hoveredObjData = this.objects.find(obj => obj.object === hitObject);
                
                if (hoveredObjData && 
                    (hoveredObjData.interaction.type === 'hover' || hoveredObjData.interaction.type === 'both')) {
                    
                    // If this is a new hover
                    if (!this.hoveredObject || this.hoveredObject.id !== hoveredObjData.id) {
                        // Remove hover effect from previous object
                        if (this.hoveredObject) {
                            this.removeHoverEffect(this.hoveredObject);
                        }
                        
                        // Apply hover effect to new object
                        this.applyHoverEffect(hoveredObjData);
                        this.hoveredObject = hoveredObjData;
                        
                        // Show tooltip if enabled
                        if (hoveredObjData.interaction.tooltipEnabled && hoveredObjData.interaction.tooltip) {
                            this.showTooltip(hoveredObjData.interaction.tooltip, event);
                        } else {
                            this.hideTooltip();
                        }
                    } else if (this.tooltipVisible) {
                        // Update tooltip position if it's visible
                        this.updateTooltipPosition(event);
                    }
                    
                    document.body.style.cursor = 'pointer';
                    return;
                }
            }
            
            // No hover - reset states
            if (this.hoveredObject) {
                this.removeHoverEffect(this.hoveredObject);
                this.hoveredObject = null;
                this.hideTooltip();
            }
            
            document.body.style.cursor = 'default';
        }
        
        // Handle click in interaction mode
        handleClick(event) {
            if (!this.interactionMode) return;
            
            // Calculate mouse position
            const rect = renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update the picking ray
            this.raycaster.setFromCamera(this.mouse, camera);
            
            // Get intersections with interactive objects
            const interactiveObjects = this.objects
                .filter(obj => obj.visible && obj.interaction && 
                       (obj.interaction.type === 'click' || obj.interaction.type === 'both'))
                .map(obj => obj.object);
            
            const intersects = this.raycaster.intersectObjects(interactiveObjects, true);
            
            if (intersects.length > 0) {
                // Find the top-level object that was intersected
                let hitObject = intersects[0].object;
                
                // Navigate up to find parent in our object list
                while (hitObject && !this.objects.some(obj => obj.object === hitObject)) {
                    hitObject = hitObject.parent;
                }
                
                const clickedObjData = this.objects.find(obj => obj.object === hitObject);
                
                if (clickedObjData && 
                    (clickedObjData.interaction.type === 'click' || clickedObjData.interaction.type === 'both')) {
                    
                    // Execute click action
                    this.executeClickAction(clickedObjData, event);
                    return;
                }
            }
            
            // No click on interactive object - exit preview mode if enabled
            const previewMode = document.getElementById('interactionPreviewMode');
            if (previewMode && previewMode.checked) {
                previewMode.checked = false;
                this.setInteractionMode(false);
                
                // Re-enable orbit controls
                orbitControls.enabled = true;
                
                // Hide preview instructions
                const previewInstructions = document.getElementById('previewInstructions');
                if (previewInstructions) {
                    previewInstructions.style.display = 'none';
                }
                
                updateSceneInfo('Exited preview mode', false, 'info');
            }
        }
        
        // Show tooltip
        showTooltip(text, event) {
            const tooltip = document.getElementById('tooltip');
            if (!tooltip) return;
            
            tooltip.textContent = text;
            tooltip.style.display = 'block';
            this.tooltipVisible = true;
            
            // Position tooltip near mouse
            this.updateTooltipPosition(event);
        }
        
        // Update tooltip position
        updateTooltipPosition(event) {
            const tooltip = document.getElementById('tooltip');
            if (!tooltip || !this.tooltipVisible) return;
            
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY + 15) + 'px';
        }
        
        // Hide tooltip
        hideTooltip() {
            const tooltip = document.getElementById('tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
                this.tooltipVisible = false;
            }
        }
        
        // Apply hover effect to object
        applyHoverEffect(objData) {
            if (!objData || !objData.object || !objData.interaction) return;
            
            const obj = objData.object;
            const effect = objData.interaction.hoverEffect;
            
            // Skip if no effect is set
            if (!effect || effect === 'none') return;
            
            // Handle the animation effect
            if (effect === 'animate') {
                // Handle GLTF animations
                const animationType = objData.interaction.animationType;
                if (animationType && animationType.startsWith('gltf:') && objData.mixer) {
                    const animName = animationType.replace('gltf:', '');
                    const action = objData.animationActions[animName];
                    
                    if (action) {
                        // Stop any current hover animation
                        if (objData.hoverAnimationPlaying && objData.hoverAnimationName) {
                            const currentAction = objData.animationActions[objData.hoverAnimationName];
                            if (currentAction) {
                                currentAction.stop();
                            }
                        }
                        
                        // Start new animation
                        action.reset();
                        action.setLoop(THREE.LoopRepeat);
                        action.play();
                        objData.hoverAnimationPlaying = true;
                        objData.hoverAnimationName = animName;
                    }
                    return;
                }
                
                // Fallback to highlight effect for built-in animations on hover
                obj.userData.isHighlighted = true;
                obj.traverse(child => {
                    if (child.isMesh) {
                        child.userData.isHighlighted = true;
                    }
                });
                return;
            }
            
            switch (effect) {
                case 'highlight':
                    // Add highlight outline
                    obj.userData.isHighlighted = true;
                    obj.traverse(child => {
                        if (child.isMesh) {
                            child.userData.isHighlighted = true;
                        }
                    });
                    break;
                    
                case 'scale':
                    // Scale up object
                    if (objData.interaction.originalScale) {
                        const scaleFactor = 1 + (objData.interaction.hoverIntensity || 0.1);
                        obj.scale.copy(objData.interaction.originalScale);
                        obj.scale.multiplyScalar(scaleFactor);
                    }
                    break;
                    
                case 'color':
                    // Change color
                    if (obj.material && obj.material.color) {
                        // Store original color if not already stored
                        if (!objData.interaction.originalColor) {
                            objData.interaction.originalColor = obj.material.color.clone();
                        }
                        
                        // Apply hover color
                        obj.material.color.set(objData.interaction.hoverColor || '#ffcc00');
                    }
                    break;
                    
                case 'emissive':
                    // Apply glow
                    if (obj.material) {
                        // Set up emissive if needed
                        if (!obj.material.emissive) {
                            obj.material.emissive = new THREE.Color();
                        }
                        
                        // Store original emissive if not already stored
                        if (!objData.interaction.originalEmissive) {
                            objData.interaction.originalEmissive = obj.material.emissive.clone();
                        }
                        
                        // Apply hover color as emissive
                        obj.material.emissive.set(objData.interaction.hoverColor || '#ffcc00');
                        obj.material.emissiveIntensity = objData.interaction.hoverIntensity || 0.5;
                    }
                    break;
            }
        }
        
        // Remove hover effect from object
        removeHoverEffect(objData) {
            if (!objData || !objData.object || !objData.interaction) return;
            
            const obj = objData.object;
            const effect = objData.interaction.hoverEffect;
            
            // Skip if no effect is set
            if (!effect || effect === 'none') return;
            
            // Handle the animation effect
            if (effect === 'animate') {
                // Stop GLTF animation started on hover
                if (objData.hoverAnimationPlaying && objData.hoverAnimationName) {
                    const action = objData.animationActions[objData.hoverAnimationName];
                    if (action) {
                        action.stop();
                    }
                    objData.hoverAnimationPlaying = false;
                    objData.hoverAnimationName = null;
                }
                
                // Remove highlight fallback
                obj.userData.isHighlighted = false;
                obj.traverse(child => {
                    if (child.isMesh) {
                        child.userData.isHighlighted = false;
                    }
                });
                return;
            }
            
            switch (effect) {
                case 'highlight':
                    // Remove highlight outline
                    obj.userData.isHighlighted = false;
                    obj.traverse(child => {
                        if (child.isMesh) {
                            child.userData.isHighlighted = false;
                        }
                    });
                    break;
                    
                case 'scale':
                    // Restore original scale
                    if (objData.interaction.originalScale) {
                        obj.scale.copy(objData.interaction.originalScale);
                    }
                    break;
                    
                case 'color':
                    // Restore original color
                    if (obj.material && objData.interaction.originalColor) {
                        obj.material.color.copy(objData.interaction.originalColor);
                    }
                    break;
                    
                case 'emissive':
                    // Restore original emissive
                    if (obj.material && objData.interaction.originalEmissive) {
                        obj.material.emissive.copy(objData.interaction.originalEmissive);
                        obj.material.emissiveIntensity = 1;
                    }
                    break;
            }
        }
        
        // Execute click action on object
        executeClickAction(objData, event) {
            if (!objData || !objData.interaction) return;
            
            const action = objData.interaction.clickAction;
            const obj = objData.object;
            
            // Skip if no action is set
            if (!action || action === 'none') return;
            
            // Cancel any ongoing animation first
            if (objData.interaction.animationId) {
                cancelAnimationFrame(objData.interaction.animationId);
                objData.interaction.animationId = null;
            }
            
            switch (action) {
                case 'toggle':
                    // Toggle object visibility
                    obj.visible = !obj.visible;
                    objData.visible = obj.visible;
                    
                    // Update layer panel to reflect visibility change
                    this.updateLayerPanel();
                    break;
                    
                case 'animate':
                    // Check if it's a GLTF animation
                    const animType = objData.interaction.animationType;
                    if (animType && animType.startsWith('gltf:') && objData.mixer) {
                        const animName = animType.replace('gltf:', '');
                        const action = objData.animationActions[animName];
                        
                        if (!action) return;
                        
                        // If animation is already playing, stop it
                        if (objData.currentGltfAnimation === animName) {
                            action.stop();
                            objData.currentGltfAnimation = null;
                            updateSceneInfo(`Stopped animation: ${animName}`, false, 'info');
                        } else {
                            // Stop any current animation
                            if (objData.currentGltfAnimation && objData.animationActions[objData.currentGltfAnimation]) {
                                objData.animationActions[objData.currentGltfAnimation].stop();
                            }
                            
                            // Play the selected animation
                            action.reset();
                            action.setLoop(THREE.LoopRepeat);
                            action.play();
                            objData.currentGltfAnimation = animName;
                            updateSceneInfo(`Playing animation: ${animName}`, false, 'success');
                        }
                        break;
                    }
                    
                    // Handle built-in animations
                    if (!objData.interaction.animating) {
                        // Store original properties for reset
                        objData.interaction.originalPosition = obj.position.clone();
                        objData.interaction.originalRotation = obj.rotation.clone();
                        objData.interaction.originalScale = obj.scale.clone();
                        
                        // Start animation based on type
                        objData.interaction.animating = true;
                        
                        switch (animType) {
                            case 'rotate':
                                this.animateRotation(objData);
                                break;
                                
                            case 'bounce':
                                this.animateBounce(objData);
                                break;
                                
                            case 'spin':
                                this.animateSpin(objData);
                                break;
                        }
                    } else {
                        // Stop animation and reset
                        objData.interaction.animating = false;
                        
                        // Reset to original properties
                        if (objData.interaction.originalPosition) {
                            obj.position.copy(objData.interaction.originalPosition);
                        }
                        if (objData.interaction.originalRotation) {
                            obj.rotation.copy(objData.interaction.originalRotation);
                        }
                        if (objData.interaction.originalScale) {
                            obj.scale.copy(objData.interaction.originalScale);
                        }
                    }
                    break;
                    
                case 'url':
                    // Open URL in new window
                    if (objData.interaction.url) {
                        window.open(objData.interaction.url, '_blank');
                    }
                    break;
                    
                case 'custom':
                    // Execute custom function if defined in window scope
                    if (objData.interaction.customFunction && 
                        typeof window[objData.interaction.customFunction] === 'function') {
                        try {
                            window[objData.interaction.customFunction](objData);
                        } catch (error) {
                            console.error('Error executing custom function:', error);
                        }
                    }
                    break;
            }
        }
        
        // Animation: Object rotation
        animateRotation(objData) {
            if (!objData || !objData.object || !objData.interaction.animating) return;
            
            const obj = objData.object;
            const startTime = Date.now();
            const duration = 2000; // 2 seconds for full rotation
            
            const animate = () => {
                if (!objData.interaction.animating) return;
                
                const elapsed = Date.now() - startTime;
                const progress = (elapsed % duration) / duration;
                
                // Rotate around Y axis
                obj.rotation.y = objData.interaction.originalRotation.y + Math.PI * 2 * progress;
                
                // Continue animation
                objData.interaction.animationId = requestAnimationFrame(animate);
            };
            
            animate();
        }
        
        // Animation: Object bounce
        animateBounce(objData) {
            if (!objData || !objData.object || !objData.interaction.animating) return;
            
            const obj = objData.object;
            const startTime = Date.now();
            const duration = 1000; // 1 second for full bounce cycle
            
            const animate = () => {
                if (!objData.interaction.animating) return;
                
                const elapsed = Date.now() - startTime;
                const progress = (elapsed % duration) / duration;
                
                // Sine wave for smooth bounce
                const bounceHeight = 1 + Math.sin(progress * Math.PI * 2) * 0.2;
                
                // Apply bounce to Y position
                obj.position.y = objData.interaction.originalPosition.y + bounceHeight - 1;
                
                // Continue animation
                objData.interaction.animationId = requestAnimationFrame(animate);
            };
            
            animate();
        }
        
        // Animation: Object spin
        animateSpin(objData) {
            if (!objData || !objData.object || !objData.interaction.animating) return;
            
            const obj = objData.object;
            const startTime = Date.now();
            const duration = 1500; // 1.5 seconds for full spin
            
            const animate = () => {
                if (!objData.interaction.animating) return;
                
                const elapsed = Date.now() - startTime;
                const progress = (elapsed % duration) / duration;
                
                // Rotate around all axes
                obj.rotation.x = objData.interaction.originalRotation.x + Math.PI * 2 * progress;
                obj.rotation.y = objData.interaction.originalRotation.y + Math.PI * 2 * progress;
                obj.rotation.z = objData.interaction.originalRotation.z + Math.PI * 2 * progress;
                
                // Continue animation
                objData.interaction.animationId = requestAnimationFrame(animate);
            };
            
            animate();
        }
        
        // Enable/disable interaction mode
        setInteractionMode(enabled) {
            this.interactionMode = enabled;
            
            // Reset any active hover/tooltip
            if (this.hoveredObject) {
                this.removeHoverEffect(this.hoveredObject);
                this.hoveredObject = null;
                this.hideTooltip();
            }
            
            // Reset cursor
            document.body.style.cursor = 'default';
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
        
        // Clear a texture map
        clearTextureMap(mapType, url) {
            if (!this.selectedObject || !this.selectedObject.object.material) return;
            
            const material = this.selectedObject.object.material;
            
            switch (mapType) {
                case 'baseColor':
                    if (material.map) {
                        material.map.dispose();
                        material.map = null;
                    }
                    break;
                case 'normal':
                    if (material.normalMap) {
                        material.normalMap.dispose();
                        material.normalMap = null;
                    }
                    break;
                case 'roughness':
                    if (material.roughnessMap) {
                        material.roughnessMap.dispose();
                        material.roughnessMap = null;
                    }
                    break;
                case 'displacement':
                    if (material.displacementMap) {
                        material.displacementMap.dispose();
                        material.displacementMap = null;
                    }
                    break;
            }
            
            material.needsUpdate = true;
            
            // Clean up the URL if provided
            if (url) {
                URL.revokeObjectURL(url);
            }
            
            updateSceneInfo(`${mapType} texture removed`, false, 'success');
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
            
            // Apply the new material
            obj.material.dispose();
            obj.material = material;
            
            // Store color reference for interaction effects
            if (this.selectedObject.interaction) {
                this.selectedObject.interaction.originalColor = material.color.clone();
            }
            
            // Update UI
            this.updateMaterialControls();
        }
        
        // Handle canvas click for object selection
        handleCanvasClick(event) {
            // Skip if in interaction mode
            if (this.interactionMode) {
                this.handleClick(event);
                return;
            }
            
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
        const messageEl = document.getElementById('processingMessage');
        
        if (indicator && messageEl) {
            messageEl.textContent = message;
            indicator.style.display = 'flex';
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
                
                // Mouse move event for hover interactions
                renderer.domElement.addEventListener('mousemove', (event) => {
                    sceneManager.handleHover(event);
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
            
            // Set up interactivity controls
            setupInteractivityControls();
            
            // Remove redundant texture drop zones UI that isn't needed
            const textureMapGrid = document.querySelector('.texture-maps-grid');
            if (textureMapGrid) {
                textureMapGrid.parentNode.removeChild(textureMapGrid);
                console.log("Removed redundant texture dropzones UI");
            }
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            updateSceneInfo('Error setting up application controls', true);
        }
    }
    
    // Set up interactivity controls
    function setupInteractivityControls() {
        // Get UI elements
        const interactionType = document.getElementById('interactionType');
        const hoverEffect = document.getElementById('hoverEffect');
        const hoverColor = document.getElementById('hoverColor');
        const hoverIntensity = document.getElementById('hoverIntensity');
        const hoverIntensityValue = document.getElementById('hoverIntensityValue');
        const clickAction = document.getElementById('clickAction');
        const actionUrl = document.getElementById('actionUrl');
        const animationType = document.getElementById('animationType');
        const customFunction = document.getElementById('customFunction');
        const enableTooltip = document.getElementById('enableTooltip');
        const tooltipContent = document.getElementById('tooltipContent');
        const interactionPreviewMode = document.getElementById('interactionPreviewMode');
        
        // Groups that need to be shown/hidden
        const hoverEffectSection = document.getElementById('hoverEffectSection');
        const clickActionSection = document.getElementById('clickActionSection');
        const hoverColorGroup = document.getElementById('hoverColorGroup');
        const hoverIntensityGroup = document.getElementById('hoverIntensityGroup');
        const urlGroup = document.getElementById('urlGroup');
        const animationGroup = document.getElementById('animationGroup');
        const customFunctionGroup = document.getElementById('customFunctionGroup');
        const tooltipContentGroup = document.getElementById('tooltipContentGroup');
        const previewInstructions = document.getElementById('previewInstructions');
        
        // Handle interaction type change
        if (interactionType) {
            interactionType.addEventListener('change', () => {
                if (!sceneManager.selectedObject) return;
                
                const type = interactionType.value;
                sceneManager.selectedObject.interaction.type = type;
                
                // Show/hide hover effect section
                if (hoverEffectSection) {
                    hoverEffectSection.style.display = 
                        (type === 'hover' || type === 'both') ? 'block' : 'none';
                }
                
                // Show/hide click action section
                if (clickActionSection) {
                    clickActionSection.style.display = 
                        (type === 'click' || type === 'both') ? 'block' : 'none';
                }
            });
        }
        
        // Handle hover effect change
        if (hoverEffect) {
            hoverEffect.addEventListener('change', () => {
                if (!sceneManager.selectedObject) return;
                
                const effect = hoverEffect.value;
                sceneManager.selectedObject.interaction.hoverEffect = effect;
                
                // Show/hide color picker
                if (hoverColorGroup) {
                    hoverColorGroup.style.display = 
                        (effect === 'color' || effect === 'emissive') ? 'block' : 'none';
                }
                
                // Show/hide intensity slider
                if (hoverIntensityGroup) {
                    hoverIntensityGroup.style.display = 
                        (effect === 'scale' || effect === 'highlight' || effect === 'emissive') ? 'block' : 'none';
                }
            });
        }
        
        // Handle hover color change
        if (hoverColor) {
            hoverColor.addEventListener('input', () => {
                if (!sceneManager.selectedObject) return;
                
                sceneManager.selectedObject.interaction.hoverColor = hoverColor.value;
            });
        }
        
        // Handle hover intensity change
        if (hoverIntensity && hoverIntensityValue) {
            hoverIntensity.addEventListener('input', () => {
                if (!sceneManager.selectedObject) return;
                
                const value = parseFloat(hoverIntensity.value);
                sceneManager.selectedObject.interaction.hoverIntensity = value;
                hoverIntensityValue.textContent = value.toFixed(2);
            });
        }
        
        // Handle click action change
        if (clickAction) {
            clickAction.addEventListener('change', () => {
                if (!sceneManager.selectedObject) return;
                
                const action = clickAction.value;
                sceneManager.selectedObject.interaction.clickAction = action;
                
                // Show/hide URL input
                if (urlGroup) {
                    urlGroup.style.display = action === 'url' ? 'block' : 'none';
                }
                
                // Show/hide animation type selector
                if (animationGroup) {
                    animationGroup.style.display = action === 'animate' ? 'block' : 'none';
                    
                    // Update animation UI for GLTF models if we're showing the animation group
                    if (action === 'animate') {
                        sceneManager.updateAnimationUI();
                    }
                }
                
                // Show/hide custom function input
                if (customFunctionGroup) {
                    customFunctionGroup.style.display = action === 'custom' ? 'block' : 'none';
                }
            });
        }
        
        // Handle URL input change
        if (actionUrl) {
            actionUrl.addEventListener('input', () => {
                if (!sceneManager.selectedObject) return;
                
                sceneManager.selectedObject.interaction.url = actionUrl.value;
            });
        }
        
        // Handle animation type change
        if (animationType) {
            animationType.addEventListener('change', () => {
                if (!sceneManager.selectedObject) return;
                
                sceneManager.selectedObject.interaction.animationType = animationType.value;
                
                // If it's a GLTF animation, update UI with info
                if (animationType.value.startsWith('gltf:')) {
                    const animName = animationType.value.replace('gltf:', '');
                    updateSceneInfo(`Selected GLTF animation: ${animName}`, false, 'info');
                }
            });
        }
        
        // Handle custom function input change
        if (customFunction) {
            customFunction.addEventListener('input', () => {
                if (!sceneManager.selectedObject) return;
                
                sceneManager.selectedObject.interaction.customFunction = customFunction.value;
            });
        }
        
        // Handle tooltip toggle
        if (enableTooltip) {
            enableTooltip.addEventListener('change', () => {
                if (!sceneManager.selectedObject) return;
                
                sceneManager.selectedObject.interaction.tooltipEnabled = enableTooltip.checked;
                
                // Show/hide tooltip content input
                if (tooltipContentGroup) {
                    tooltipContentGroup.style.display = enableTooltip.checked ? 'block' : 'none';
                }
            });
        }
        
        // Handle tooltip content change
        if (tooltipContent) {
            tooltipContent.addEventListener('input', () => {
                if (!sceneManager.selectedObject) return;
                
                sceneManager.selectedObject.interaction.tooltip = tooltipContent.value;
            });
        }
        
        // Handle interaction preview mode toggle
        if (interactionPreviewMode) {
            interactionPreviewMode.addEventListener('change', () => {
                const enabled = interactionPreviewMode.checked;
                
                // Enable/disable interaction mode
                sceneManager.setInteractionMode(enabled);
                
                // Enable/disable orbit controls
                orbitControls.enabled = !enabled;
                
                // Show/hide preview instructions
                if (previewInstructions) {
                    previewInstructions.style.display = enabled ? 'block' : 'none';
                }
                
                if (enabled) {
                    updateSceneInfo('Interactive preview mode enabled', false, 'info');
                } else {
                    updateSceneInfo('Exited preview mode', false, 'info');
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
                        
                        // Update interaction original color reference
                        if (sceneManager.selectedObject.interaction) {
                            sceneManager.selectedObject.interaction.originalColor = 
                                sceneManager.selectedObject.object.material.color.clone();
                        }
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
                    positionInput.addEventListener('
