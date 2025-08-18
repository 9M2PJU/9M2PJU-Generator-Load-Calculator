document.addEventListener('DOMContentLoaded', () => {
    const generatorKvaInput = document.getElementById('generator-kva');
    const cableTypeInput = document.getElementById('cable-type');
    const fuelAmountInput = document.getElementById('fuel-amount');
    const generatorRuntimeInput = document.getElementById('generator-runtime');
    const loadsContainer = document.getElementById('loads-container');
    const addLoadBtn = document.getElementById('add-load');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsOutput = document.getElementById('results-output');

    let loadCount = 0;

    // Function to add a new load input group
    addLoadBtn.addEventListener('click', () => {
        loadCount++;
        const loadDiv = document.createElement('div');
        loadDiv.classList.add('load');
        loadDiv.id = `load-${loadCount}`;
        loadDiv.innerHTML = `
            <input type="text" class="load-description" placeholder="Load Description (e.g., Motor)">
            <input type="number" class="load-power" placeholder="Power (kW)">
            <input type="number" class="load-factor" placeholder="Starting Factor">
            <button class="remove-load">Remove</button>
        `;
        loadsContainer.appendChild(loadDiv);

        // Add event listener to the new remove button
        loadDiv.querySelector('.remove-load').addEventListener('click', () => {
            loadDiv.remove();
        });
    });

    // Function to calculate the generator requirements
    calculateBtn.addEventListener('click', () => {
        const generatorKva = parseFloat(generatorKvaInput.value) || 0;
        if (generatorKva === 0) {
            resultsOutput.textContent = 'Please enter the generator kVA value.';
            return;
        }

        const loads = document.querySelectorAll('.load');
        if (loads.length === 0) {
            resultsOutput.textContent = 'Please add at least one load.';
            return;
        }

        let totalConstantPower = 0;
        let allLoads = [];

        loads.forEach(load => {
            const power = parseFloat(load.querySelector('.load-power').value) || 0;
            const factor = parseFloat(load.querySelector('.load-factor').value) || 1;
            const startingPower = power * factor;

            if(power > 0) {
                allLoads.push({ power, startingPower });
                totalConstantPower += power;
            }
        });

        if (totalConstantPower === 0) {
            resultsOutput.textContent = 'Please enter power values for the loads.';
            return;
        }

        // Find the most demanding scenario
        let maxRequiredKw = totalConstantPower; // Baseline is just all loads running

        // The peak is when the largest starting load kicks in while others are running
        if (allLoads.length > 0) {
            let maxStartingPowerLoad = allLoads.sort((a, b) => b.startingPower - a.startingPower)[0];
            let runningPowerOfOtherLoads = totalConstantPower - maxStartingPowerLoad.power;
            maxRequiredKw = maxStartingPowerLoad.startingPower + runningPowerOfOtherLoads;
        }

        const safetyMargin = 1.10; // 10%
        const powerFactor = 0.8;

        const requiredKwWithMargin = maxRequiredKw * safetyMargin;
        const requiredKva = requiredKwWithMargin / powerFactor;

        // Display results
        let resultMessage = `
            <p>Total Constant Load: ${totalConstantPower.toFixed(2)} kW</p>
            <p>Peak Required Load (including starting factor): ${maxRequiredKw.toFixed(2)} kW</p>
            <p>Required Generator kVA (with 10% safety margin): <strong>${requiredKva.toFixed(2)} kVA</strong></p>
        `;

        if (generatorKva >= requiredKva) {
            resultMessage += `<p style="color: green;">Your generator with ${generatorKva} kVA has enough capacity.</p>`;
        } else {
            resultMessage += `<p style="color: red;">Your generator with ${generatorKva} kVA is undersized. You need at least ${requiredKva.toFixed(2)} kVA.</p>`;
        }

        // Acknowledge other fields (future implementation)
        const cableType = cableTypeInput.value;
        const fuelAmount = fuelAmountInput.value;
        const runtime = generatorRuntimeInput.value;
        if(cableType || fuelAmount || runtime){
            resultMessage += `<hr><p>Note: Calculations for cable type, fuel consumption, and runtime are not yet implemented.</p>`;
        }

        resultsOutput.innerHTML = resultMessage;
    });
});
