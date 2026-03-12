(function () {
    var API_BASE = localStorage.getItem("eduflow_api_base") || "http://localhost:5000/api";
    var TOKEN_KEY = "eduflow_auth_token";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || "";
    }

    function setToken(token) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
    }

    function clearToken() {
        localStorage.removeItem(TOKEN_KEY);
    }

    async function request(path, options) {
        var opts = options || {};
        var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
        var token = getToken();
        if (token) headers.Authorization = "Bearer " + token;

        var response = await fetch(API_BASE + path, Object.assign({}, opts, { headers: headers }));
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok) {
            var msg = payload.message || "Request failed";
            throw new Error(msg);
        }
        return payload;
    }

    window.EduFlowAPI = {
        base: API_BASE,
        setBase: function (url) {
            localStorage.setItem("eduflow_api_base", url);
        },
        getToken: getToken,
        setToken: setToken,
        clearToken: clearToken,
        request: request
    };
})();
