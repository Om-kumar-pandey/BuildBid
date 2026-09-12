/* =========================================================
   BUILDBID — CINEMATIC CONSTRUCTION BACKGROUND
   animation.js

   NO VIDEO
   NO THREE.JS
   NO EXTERNAL LIBRARY

   Features:
   - Architectural background
   - Slow cinematic zoom
   - Blueprint grid
   - Construction scan
   - Floating particles
   - Glowing nodes
   - Technical connection lines
   - Light sweep
   - Structural geometry
   - Building wireframe
   - Crane silhouettes
   - Mouse parallax
   - Responsive
   - Performance optimized
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CANVAS
       ===================================================== */

    let canvas =
        document.getElementById(
            "buildbid-canvas-animation"
        );


    if (!canvas) {

        canvas =
            document.createElement("canvas");

        canvas.id =
            "buildbid-canvas-animation";

        document.body.prepend(canvas);

    }


    const ctx =
        canvas.getContext(
            "2d",
            {
                alpha: true
            }
        );


    if (!ctx) {

        console.warn(
            "BuildBid animation could not start."
        );

        return;

    }


    /* =====================================================
       IMAGE
       ===================================================== */

    const backgroundImage =
        new Image();


    backgroundImage.src =
        "construction-bg.png";


    let imageLoaded = false;


    backgroundImage.onload =
        function () {

            imageLoaded = true;

        };


    /* =====================================================
       VARIABLES
       ===================================================== */

    let width = 0;

    let height = 0;

    let dpr = 1;

    let animationFrame = null;

    let particles = [];

    let nodes = [];

    let buildings = [];


    /* =====================================================
       CONFIG
       ===================================================== */

    const CONFIG = {

        maxDPR: 2,

        particleCountDesktop: 85,

        particleCountMobile: 35,

        particleSpeed: 0.12,

        connectionDistance: 145,

        gridSize: 55,

        fineGridSize: 18,

        buildingCount: 5,

        scanSpeed: 0.00035,

        lightSpeed: 0.00028,

        cameraSpeed: 0.00008,

        parallax: 12

    };


    /* =====================================================
       MOUSE
       ===================================================== */

    const mouse = {

        x: 0,

        y: 0,

        targetX: 0,

        targetY: 0

    };


    /* =====================================================
       TIME
       ===================================================== */

    let startTime =
        performance.now();


    /* =====================================================
       RESIZE
       ===================================================== */

    function resize() {

        width =
            window.innerWidth;

        height =
            window.innerHeight;


        dpr =
            Math.min(
                window.devicePixelRatio || 1,
                CONFIG.maxDPR
            );


        canvas.width =
            width * dpr;


        canvas.height =
            height * dpr;


        canvas.style.width =
            width + "px";


        canvas.style.height =
            height + "px";


        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );


        createParticles();

        createNodes();

        createBuildings();

    }


    /* =====================================================
       RANDOM
       ===================================================== */

    function random(min, max) {

        return (
            Math.random() *
            (max - min) +
            min
        );

    }


    /* =====================================================
       PARTICLES
       ===================================================== */

    class Particle {

        constructor() {

            this.x =
                random(
                    0,
                    width
                );


            this.y =
                random(
                    0,
                    height
                );


            this.size =
                random(
                    0.5,
                    2
                );


            this.speedX =
                random(
                    -CONFIG.particleSpeed,
                    CONFIG.particleSpeed
                );


            this.speedY =
                random(
                    -CONFIG.particleSpeed,
                    CONFIG.particleSpeed
                );


            this.alpha =
                random(
                    0.18,
                    0.65
                );


            this.phase =
                random(
                    0,
                    Math.PI * 2
                );


            this.gold =
                Math.random() >
                0.88;

        }


        update(time) {

            this.x +=
                this.speedX;


            this.y +=
                this.speedY;


            this.y +=
                Math.sin(
                    time * 0.0005 +
                    this.phase
                ) * 0.03;


            if (
                this.x < -20
            ) {

                this.x =
                    width + 20;

            }


            if (
                this.x > width + 20
            ) {

                this.x = -20;

            }


            if (
                this.y < -20
            ) {

                this.y =
                    height + 20;

            }


            if (
                this.y > height + 20
            ) {

                this.y = -20;

            }

        }


        draw() {

            const px =
                this.x +
                (
                    mouse.x /
                    width -
                    0.5
                ) *
                5;


            const py =
                this.y +
                (
                    mouse.y /
                    height -
                    0.5
                ) *
                5;


            const color =
                this.gold
                    ? "245,166,35"
                    : "13,138,188";


            ctx.beginPath();


            ctx.arc(
                px,
                py,
                this.size,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                `rgba(${color},${this.alpha})`;


            ctx.shadowBlur =
                7;


            ctx.shadowColor =
                `rgba(${color},0.5)`;


            ctx.fill();


            ctx.shadowBlur = 0;

        }

    }


    /* =====================================================
       PARTICLE CREATION
       ===================================================== */

    function createParticles() {

        particles = [];


        const count =
            width < 768
                ? CONFIG.particleCountMobile
                : CONFIG.particleCountDesktop;


        for (
            let i = 0;
            i < count;
            i++
        ) {

            particles.push(
                new Particle()
            );

        }

    }


    /* =====================================================
       NODES
       ===================================================== */

    function createNodes() {

        nodes = [];


        const count =
            width < 768
                ? 12
                : 25;


        for (
            let i = 0;
            i < count;
            i++
        ) {

            nodes.push({

                x:
                    random(
                        0,
                        width
                    ),

                y:
                    random(
                        0,
                        height
                    ),

                size:
                    random(
                        1,
                        3
                    ),

                phase:
                    random(
                        0,
                        Math.PI * 2
                    )

            });

        }

    }


    /* =====================================================
       BUILDING DATA
       ===================================================== */

    function createBuildings() {

        buildings = [];


        const count =
            width < 768
                ? 3
                : CONFIG.buildingCount;


        for (
            let i = 0;
            i < count;
            i++
        ) {

            buildings.push({

                x:
                    width *
                    (
                        0.12 +
                        i * 0.19
                    ),

                width:
                    random(
                        55,
                        115
                    ),

                height:
                    random(
                        90,
                        250
                    ),

                floors:
                    Math.floor(
                        random(
                            5,
                            12
                        )
                    ),

                phase:
                    random(
                        0,
                        Math.PI * 2
                    )

            });

        }

    }


    /* =====================================================
       DRAW BACKGROUND IMAGE
       ===================================================== */

    function drawBackgroundImage(time) {

        if (!imageLoaded) {

            return;

        }


        /*
         * Cinematic slow zoom.
         */

        const camera =
            1 +
            Math.sin(
                time *
                CONFIG.cameraSpeed
            ) *
            0.018;


        const imageRatio =
            backgroundImage.width /
            backgroundImage.height;


        const screenRatio =
            width /
            height;


        let drawWidth;

        let drawHeight;


        if (
            imageRatio >
            screenRatio
        ) {

            drawHeight =
                height *
                camera;


            drawWidth =
                drawHeight *
                imageRatio;

        } else {

            drawWidth =
                width *
                camera;


            drawHeight =
                drawWidth /
                imageRatio;

        }


        const parallaxX =
            (
                mouse.x /
                width -
                0.5
            ) *
            CONFIG.parallax;


        const parallaxY =
            (
                mouse.y /
                height -
                0.5
            ) *
            CONFIG.parallax;


        const x =
            (
                width -
                drawWidth
            ) / 2 +
            parallaxX;


        const y =
            (
                height -
                drawHeight
            ) / 2 +
            parallaxY;


        /*
         * Very subtle opacity.
         */

        ctx.globalAlpha =
            0.58;


        ctx.drawImage(
            backgroundImage,
            x,
            y,
            drawWidth,
            drawHeight
        );


        ctx.globalAlpha =
            1;

    }


    /* =====================================================
       BLUEPRINT GRID
       ===================================================== */

    function drawGrid(time) {

        const offset =
            (
                time *
                0.018
            ) %
            CONFIG.gridSize;


        /*
         * Fine grid
         */

        ctx.lineWidth =
            0.35;


        ctx.strokeStyle =
            "rgba(13,138,188,0.045)";


        for (
            let x =
                -CONFIG.fineGridSize;
            x <
                width +
                CONFIG.fineGridSize;
            x +=
                CONFIG.fineGridSize
        ) {

            ctx.beginPath();

            ctx.moveTo(
                x + offset,
                0
            );

            ctx.lineTo(
                x + offset,
                height
            );

            ctx.stroke();

        }


        for (
            let y =
                -CONFIG.fineGridSize;
            y <
                height +
                CONFIG.fineGridSize;
            y +=
                CONFIG.fineGridSize
        ) {

            ctx.beginPath();

            ctx.moveTo(
                0,
                y + offset
            );

            ctx.lineTo(
                width,
                y + offset
            );

            ctx.stroke();

        }


        /*
         * Main grid
         */

        ctx.lineWidth =
            0.65;


        ctx.strokeStyle =
            "rgba(13,138,188,0.075)";


        for (
            let x =
                -CONFIG.gridSize;
            x <
                width +
                CONFIG.gridSize;
            x +=
                CONFIG.gridSize
        ) {

            ctx.beginPath();

            ctx.moveTo(
                x + offset,
                0
            );

            ctx.lineTo(
                x + offset,
                height
            );

            ctx.stroke();

        }


        for (
            let y =
                -CONFIG.gridSize;
            y <
                height +
                CONFIG.gridSize;
            y +=
                CONFIG.gridSize
        ) {

            ctx.beginPath();

            ctx.moveTo(
                0,
                y + offset
            );

            ctx.lineTo(
                width,
                y + offset
            );

            ctx.stroke();

        }

    }


    /* =====================================================
       BUILDING WIREFRAME
       ===================================================== */

    function drawBuildings(time) {

        buildings.forEach(
            function (building) {

                const pulse =
                    (
                        Math.sin(
                            time * 0.0007 +
                            building.phase
                        ) + 1
                    ) *
                    0.5;


                const alpha =
                    0.055 +
                    pulse *
                    0.035;


                const x =
                    building.x;


                const bottom =
                    height *
                    0.78;


                const top =
                    bottom -
                    building.height;


                /*
                 * Building outline
                 */

                ctx.strokeStyle =
                    `rgba(13,138,188,${alpha})`;


                ctx.lineWidth =
                    0.8;


                ctx.strokeRect(
                    x,
                    top,
                    building.width,
                    building.height
                );


                /*
                 * Floors
                 */

                const floorHeight =
                    building.height /
                    building.floors;


                for (
                    let floor = 1;
                    floor <
                    building.floors;
                    floor++
                ) {

                    const fy =
                        top +
                        floor *
                        floorHeight;


                    ctx.beginPath();


                    ctx.moveTo(
                        x,
                        fy
                    );


                    ctx.lineTo(
                        x +
                        building.width,
                        fy
                    );


                    ctx.stroke();

                }


                /*
                 * Vertical columns
                 */

                const columns =
                    Math.max(
                        2,
                        Math.floor(
                            building.width /
                            25
                        )
                    );


                for (
                    let c = 1;
                    c < columns;
                    c++
                ) {

                    const cx =
                        x +
                        (
                            building.width /
                            columns
                        ) *
                        c;


                    ctx.beginPath();


                    ctx.moveTo(
                        cx,
                        top
                    );


                    ctx.lineTo(
                        cx,
                        bottom
                    );


                    ctx.stroke();

                }


                /*
                 * Construction top beam
                 */

                ctx.beginPath();


                ctx.moveTo(
                    x - 10,
                    top
                );


                ctx.lineTo(
                    x +
                    building.width +
                    10,
                    top
                );


                ctx.stroke();


                /*
                 * Vertical crane-like extension
                 */

                if (
                    building.height >
                    180
                ) {

                    ctx.beginPath();


                    ctx.moveTo(
                        x +
                        building.width *
                        0.5,
                        top
                    );


                    ctx.lineTo(
                        x +
                        building.width *
                        0.5,
                        top - 55
                    );


                    ctx.stroke();

                }

            }
        );

    }


    /* =====================================================
       CONNECTIONS
       ===================================================== */

    function drawConnections() {

        for (
            let i = 0;
            i < nodes.length;
            i++
        ) {

            for (
                let j = i + 1;
                j < nodes.length;
                j++
            ) {

                const a =
                    nodes[i];


                const b =
                    nodes[j];


                const dx =
                    a.x -
                    b.x;


                const dy =
                    a.y -
                    b.y;


                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (
                    distance <
                    CONFIG.connectionDistance
                ) {

                    const opacity =
                        (
                            1 -
                            distance /
                            CONFIG.connectionDistance
                        ) *
                        0.11;


                    ctx.beginPath();


                    ctx.moveTo(
                        a.x,
                        a.y
                    );


                    ctx.lineTo(
                        b.x,
                        b.y
                    );


                    ctx.strokeStyle =
                        `rgba(13,138,188,${opacity})`;


                    ctx.lineWidth =
                        0.5;


                    ctx.stroke();

                }

            }

        }

    }


    /* =====================================================
       NODE DRAWING
       ===================================================== */

    function drawNodes(time) {

        nodes.forEach(
            function (node) {

                const pulse =
                    (
                        Math.sin(
                            time * 0.001 +
                            node.phase
                        ) + 1
                    ) /
                    2;


                const radius =
                    node.size +
                    pulse *
                    1.5;


                ctx.beginPath();


                ctx.arc(
                    node.x,
                    node.y,
                    radius,
                    0,
                    Math.PI * 2
                );


                ctx.fillStyle =
                    `rgba(13,138,188,${0.22 + pulse * 0.25})`;


                ctx.shadowBlur =
                    8;


                ctx.shadowColor =
                    "rgba(13,138,188,0.4)";


                ctx.fill();


                ctx.shadowBlur =
                    0;

            }
        );

    }


    /* =====================================================
       CONSTRUCTION SCAN
       ===================================================== */

    function drawConstructionScan(time) {

        const progress =
            (
                time *
                CONFIG.scanSpeed
            ) %
            1;


        const scanY =
            progress *
            height;


        const gradient =
            ctx.createLinearGradient(
                0,
                scanY - 100,
                0,
                scanY + 100
            );


        gradient.addColorStop(
            0,
            "rgba(13,138,188,0)"
        );


        gradient.addColorStop(
            0.5,
            "rgba(13,138,188,0.12)"
        );


        gradient.addColorStop(
            1,
            "rgba(13,138,188,0)"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(
            0,
            scanY - 100,
            width,
            200
        );


        /*
         * Thin scan line
         */

        ctx.beginPath();


        ctx.moveTo(
            0,
            scanY
        );


        ctx.lineTo(
            width,
            scanY
        );


        ctx.strokeStyle =
            "rgba(13,138,188,0.12)";


        ctx.lineWidth =
            0.7;


        ctx.stroke();

    }


    /* =====================================================
       LIGHT SWEEP
       ===================================================== */

    function drawLightSweep(time) {

        const progress =
            (
                time *
                CONFIG.lightSpeed
            ) %
            1;


        const x =
            -250 +
            progress *
            (
                width +
                500
            );


        const gradient =
            ctx.createLinearGradient(
                x - 200,
                0,
                x + 200,
                0
            );


        gradient.addColorStop(
            0,
            "rgba(255,255,255,0)"
        );


        gradient.addColorStop(
            0.5,
            "rgba(255,255,255,0.12)"
        );


        gradient.addColorStop(
            1,
            "rgba(255,255,255,0)"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(
            0,
            0,
            width,
            height
        );

    }


    /* =====================================================
       BLUEPRINT CIRCLE
       ===================================================== */

    function drawBlueprintCircle(time) {

        const cx =
            width * 0.52;


        const cy =
            height * 0.48;


        const radius =
            Math.min(
                width,
                height
            ) *
            0.30;


        const rotation =
            time *
            0.00008;


        ctx.save();


        ctx.translate(
            cx,
            cy
        );


        ctx.rotate(
            rotation
        );


        ctx.strokeStyle =
            "rgba(13,138,188,0.10)";


        ctx.lineWidth =
            0.8;


        ctx.setLineDash(
            [5, 9]
        );


        ctx.beginPath();


        ctx.arc(
            0,
            0,
            radius,
            0,
            Math.PI * 2
        );


        ctx.stroke();


        ctx.setLineDash([]);


        /*
         * Crosshair
         */

        ctx.beginPath();


        ctx.moveTo(
            -radius - 25,
            0
        );


        ctx.lineTo(
            radius + 25,
            0
        );


        ctx.moveTo(
            0,
            -radius - 25
        );


        ctx.lineTo(
            0,
            radius + 25
        );


        ctx.stroke();


        ctx.restore();

    }


    /* =====================================================
       AMBIENT GLOW
       ===================================================== */

    function drawAmbientGlow(time) {

        const pulse =
            (
                Math.sin(
                    time * 0.0006
                ) + 1
            ) /
            2;


        const gradient =
            ctx.createRadialGradient(
                width * 0.50,
                height * 0.45,
                0,
                width * 0.50,
                height * 0.45,
                Math.max(
                    width,
                    height
                ) * 0.65
            );


        gradient.addColorStop(
            0,
            `rgba(255,255,255,${0.28 + pulse * 0.06})`
        );


        gradient.addColorStop(
            0.55,
            "rgba(220,238,248,0.06)"
        );


        gradient.addColorStop(
            1,
            "rgba(220,238,248,0)"
        );


        ctx.fillStyle =
            gradient;


        ctx.fillRect(
            0,
            0,
            width,
            height
        );

    }


    /* =====================================================
       PARTICLES
       ===================================================== */

    function updateParticles(time) {

        particles.forEach(
            function (particle) {

                particle.update(
                    time
                );

            }
        );

    }


    function drawParticles() {

        particles.forEach(
            function (particle) {

                particle.draw();

            }
        );

    }


    /* =====================================================
       MAIN RENDER
       ===================================================== */

    function render(time) {

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /*
         * 1.
         * Generated construction image
         */

        drawBackgroundImage(
            time
        );


        /*
         * 2.
         * Soft cinematic glow
         */

        drawAmbientGlow(
            time
        );


        /*
         * 3.
         * Blueprint grid
         */

        drawGrid(
            time
        );


        /*
         * 4.
         * Architectural wireframes
         */

        drawBuildings(
            time
        );


        /*
         * 5.
         * Technical blueprint circle
         */

        drawBlueprintCircle(
            time
        );


        /*
         * 6.
         * Network connections
         */

        drawConnections();


        /*
         * 7.
         * Nodes
         */

        drawNodes(
            time
        );


        /*
         * 8.
         * Particles
         */

        updateParticles(
            time
        );


        drawParticles();


        /*
         * 9.
         * Construction scanning effect
         */

        drawConstructionScan(
            time
        );


        /*
         * 10.
         * Light sweep
         */

        drawLightSweep(
            time
        );

    }


    /* =====================================================
       ANIMATION LOOP
       ===================================================== */

    function animate(time) {

        render(
            time
        );


        animationFrame =
            requestAnimationFrame(
                animate
            );

    }


    /* =====================================================
       MOUSE
       ===================================================== */

    window.addEventListener(
        "mousemove",
        function (event) {

            mouse.targetX =
                event.clientX;


            mouse.targetY =
                event.clientY;

        },
        {
            passive: true
        }
    );


    function updateMouse() {

        mouse.x +=
            (
                mouse.targetX -
                mouse.x
            ) *
            0.035;


        mouse.y +=
            (
                mouse.targetY -
                mouse.y
            ) *
            0.035;


        requestAnimationFrame(
            updateMouse
        );

    }


    /* =====================================================
       VISIBILITY
       ===================================================== */

    document.addEventListener(
        "visibilitychange",
        function () {

            if (
                document.hidden
            ) {

                if (
                    animationFrame
                ) {

                    cancelAnimationFrame(
                        animationFrame
                    );


                    animationFrame =
                        null;

                }

            } else {

                if (
                    !animationFrame
                ) {

                    animationFrame =
                        requestAnimationFrame(
                            animate
                        );

                }

            }

        }
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    mouse.x =
        window.innerWidth / 2;


    mouse.y =
        window.innerHeight / 2;


    mouse.targetX =
        mouse.x;


    mouse.targetY =
        mouse.y;


    resize();


    window.addEventListener(
        "resize",
        resize,
        {
            passive: true
        }
    );


    updateMouse();


    animationFrame =
        requestAnimationFrame(
            animate
        );


})();