// Simple test add-in
geotab.addin.ruc = function(api, state) {
    return {
        initialize: function(api, state, callback) {
            console.log("Test add-in initialized successfully");
            // Show a simple message in the UI
            const content = document.getElementById('rucAddin');
            if (content) {
                content.innerHTML = '<h1>Test Add-in Working</h1><p>If you can see this message, the add-in is working correctly.</p>';
                content.style.display = 'block';
            }
            if (callback) {
                callback();
            }
        },
        focus: function(api, state) {
            console.log("Test add-in focused");
        },
        blur: function() {
            console.log("Test add-in blurred");
        }
    };
};
