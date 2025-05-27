// StarWars API Code
// This code intentionally violates clean code principles for refactoring practice

const http = require("http");
const https = require("https");
const process = require("process");

// Defines the slice used for process.argv. The number 2 means that we only want the command line arguments 
const processCommandLine = 2;

// Constantes de configuração
const CONFIG = {
    API_BASE_URL: "https://swapi.dev/api",
    DEFAULT_TIMEOUT: 5000,
    DEFAULT_PORT: 3000,
    DEBUG_MODE: true,
    CACHE: {},
    ERROR_COUNT: 0,
    FETCH_COUNT: 0,
    TOTAL_SIZE: 0,
    LAST_ID: 1
};

// Constantes para filtros e limites
const FILTERS = {
    MIN_POPULATION: 1000000000,
    MIN_DIAMETER: 10000,
    MAX_STARSHIPS_TO_DISPLAY: 3,
    MAX_VEHICLE_ID: 4
};

// Constantes HTTP
const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404
};

// Função para fazer requisições à API
async function fetchFromStarWarsAPI(endpoint) {
    if (CONFIG.CACHE[endpoint]) {
        logDebug("Usando dados em cache para", endpoint);
        return CONFIG.CACHE[endpoint];
    }

    try {
        const data = await requestWithTimeout(`${CONFIG.API_BASE_URL}/${endpoint}`);
        const parsed = JSON.parse(data);
        CONFIG.CACHE[endpoint] = parsed;
        logDebug(`Dados obtidos com sucesso para ${endpoint}`);
        logDebug(`Tamanho do cache: ${Object.keys(CONFIG.CACHE).length}`);
        return parsed;
    } catch (err) {
        CONFIG.ERROR_COUNT++;
        throw err;
    }
}

function logDebug(...args) {
    if (CONFIG.DEBUG_MODE) console.log(...args);
}

function requestWithTimeout(url) {
    return new Promise((resolve, reject) => {
        let data = "";
        const request = https.get(url, { rejectUnauthorized: false }, response => {
            if (response.statusCode >= HTTP_STATUS.BAD_REQUEST) {
                return reject(new Error(`Falha na requisição com código ${response.statusCode}`));
            }

            response.on("data", chunk => data += chunk);
            response.on("end", () => resolve(data));
            return true;
        });

        request.on("error", reject);
        request.setTimeout(CONFIG.DEFAULT_TIMEOUT, () => {
            request.abort();
            reject(new Error("Tempo limite excedido"));
        });
    });
}

// Função para exibir detalhes de um personagem
async function displayCharacterDetails(characterId) {
    const character = await fetchFromStarWarsAPI(`people/${characterId}`);
    CONFIG.TOTAL_SIZE += JSON.stringify(character).length;
    
    console.log("Personagem:", character.name);
    console.log("Altura:", character.height);
    console.log("Massa:", character.mass);
    console.log("Ano de Nascimento:", character.birth_year);
    if (character.films?.length > 0) {
        console.log("Aparece em", character.films.length, "filmes");
    }
}

// Função para exibir detalhes de uma nave
function displayStarshipInfo(starship, index) {
    console.log(`\nNave ${index + 1}:`);
    console.log("Nome:", starship.name);
    console.log("Modelo:", starship.model);
    console.log("Fabricante:", starship.manufacturer);
    const cost = starship.cost_in_credits !== "unknown" 
        ? `${starship.cost_in_credits} créditos` 
        : "desconhecido";
    console.log("Custo:", cost);
    console.log("Velocidade:", starship.max_atmosphering_speed);
    console.log("Classificação do Hiperdrive:", starship.hyperdrive_rating);
    if (starship.pilots?.length > 0) {
        console.log("Pilotos:", starship.pilots.length);
    }
}

// Função para exibir detalhes das naves
async function displayStarshipDetails() {
    const starships = await fetchFromStarWarsAPI("starships/?page=1");
    CONFIG.TOTAL_SIZE += JSON.stringify(starships).length;
    
    console.log("\nTotal de Naves:", starships.count);
    
    for (let i = 0; i < FILTERS.MAX_STARSHIPS_TO_DISPLAY; i++) {
        if (i < starships.results.length) {
            displayStarshipInfo(starships.results[i], i);
        }
    }
}

// Função para verificar se um planeta é grande e populoso
function isLargePopulatedPlanet(planet) {
    return planet.population !== "unknown" && 
           parseInt(planet.population) > FILTERS.MIN_POPULATION && 
           planet.diameter !== "unknown" && 
           parseInt(planet.diameter) > FILTERS.MIN_DIAMETER;
}

// Função para exibir planetas grandes e populosos
async function displayLargePopulatedPlanets() {
    const planets = await fetchFromStarWarsAPI("planets/?page=1");
    CONFIG.TOTAL_SIZE += JSON.stringify(planets).length;
    
    console.log("\nPlanetas grandes e populosos:");
    for (const planet of planets.results) {
        if (isLargePopulatedPlanet(planet)) {
            const planetInfo = `${planet.name} - População: ${planet.population} - ` +
                             `Diâmetro: ${planet.diameter} - Clima: ${planet.climate}`;
            console.log(planetInfo);
            if (planet.films?.length > 0) {
                console.log(`  Aparece em ${planet.films.length} filmes`);
            }
        }
    }
}

// Função para exibir detalhes de um filme
function displayFilmInfo(film, index) {
    console.log(`${index + 1}. ${film.title} (${film.release_date})`);
    console.log(`   Diretor: ${film.director}`);
    console.log(`   Produtor: ${film.producer}`);
    console.log(`   Personagens: ${film.characters.length}`);
    console.log(`   Planetas: ${film.planets.length}`);
}

// Função para exibir filmes em ordem cronológica
async function displayFilmsChronologically() {
    const films = await fetchFromStarWarsAPI("films/");
    CONFIG.TOTAL_SIZE += JSON.stringify(films).length;
    
    const filmList = films.results.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
    
    console.log("\nFilmes Star Wars em ordem cronológica:");
    filmList.forEach((film, index) => displayFilmInfo(film, index));
}

// Função para exibir detalhes de um veículo
async function displayVehicleDetails() {
    if (CONFIG.LAST_ID <= FILTERS.MAX_VEHICLE_ID) {
        const vehicle = await fetchFromStarWarsAPI(`vehicles/${CONFIG.LAST_ID}`);
        CONFIG.TOTAL_SIZE += JSON.stringify(vehicle).length;
        
        console.log("\nVeículo em Destaque:");
        console.log("Nome:", vehicle.name);
        console.log("Modelo:", vehicle.model);
        console.log("Fabricante:", vehicle.manufacturer);
        console.log("Custo:", vehicle.cost_in_credits, "créditos");
        console.log("Comprimento:", vehicle.length);
        console.log("Tripulação Necessária:", vehicle.crew);
        console.log("Passageiros:", vehicle.passengers);
        CONFIG.LAST_ID++;
    }
}

// Função principal para buscar e exibir dados
async function fetchAndDisplayStarWarsData() {
    try {
        if (CONFIG.DEBUG_MODE) console.log("Iniciando busca de dados...");
        CONFIG.FETCH_COUNT++;
        
        await displayCharacterDetails(CONFIG.LAST_ID);
        await displayStarshipDetails();
        await displayLargePopulatedPlanets();
        await displayFilmsChronologically();
        await displayVehicleDetails();
        
        if (CONFIG.DEBUG_MODE) {
            console.log("\nEstatísticas:");
            console.log("Chamadas à API:", CONFIG.FETCH_COUNT);
            console.log("Tamanho do Cache:", Object.keys(CONFIG.CACHE).length);
            console.log("Tamanho Total dos Dados:", CONFIG.TOTAL_SIZE, "bytes");
            console.log("Contagem de Erros:", CONFIG.ERROR_COUNT);
        }
        
    } catch (error) {
        console.error("Erro:", error.message);
        CONFIG.ERROR_COUNT++;
    }
}

// Modularizando partes do HTML para reduzir tamanho da função
function createHtmlHeader() {
    return `<!DOCTYPE html>
<html>
    <head>
        <title>Demonstração da API Star Wars</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #FFE81F; background-color: #000; padding: 10px; }
            button { background-color: #FFE81F; border: none; padding: 10px 20px; cursor: pointer; }
            .footer { margin-top: 50px; font-size: 12px; color: #666; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
        </style>
    </head>
    <body>`;
}
function createHtmlBody() {
    return `
        <h1>Demonstração da API Star Wars</h1>
        <p>Esta página demonstra a busca de dados da API Star Wars.</p>
        <p>Verifique o console para ver os resultados da API.</p>
        <button onclick="fetchData()">Buscar Dados Star Wars</button>
        <div id="results"></div>
        <script>
            function fetchData() {
                document.getElementById("results").innerHTML = "<p>Carregando dados...</p>";
                fetch("/api")
                    .then(res => res.text())
                    .then(text => {
                        alert("Requisição à API realizada! Verifique o console do servidor.");
                        document.getElementById("results").innerHTML = 
                            "<p>Dados obtidos! Verifique o console do servidor.</p>";
                    })
                    .catch(err => {
                        document.getElementById("results").innerHTML = 
                            "<p>Erro: " + err.message + "</p>";
                    });
            }
        </script>`;
}
function createHtmlFooter() {
    return `
        <div class="footer">
            <p>Chamadas à API: ${CONFIG.FETCH_COUNT} | Entradas no Cache: ${Object.keys(CONFIG.CACHE).length} | 
               Erros: ${CONFIG.ERROR_COUNT}</p>
            <pre>Modo Debug: ${CONFIG.DEBUG_MODE ? "ATIVO" : "INATIVO"} | 
                  Timeout: ${CONFIG.DEFAULT_TIMEOUT}ms</pre>
        </div>
    </body>
</html>`;
}
function createHtmlPage() {
    return createHtmlHeader() + createHtmlBody() + createHtmlFooter();
}

// Configuração do servidor HTTP
const server = http.createServer((request, response) => {
    if (request.url === "/" || request.url === "/index.html") {
        response.writeHead(HTTP_STATUS.OK, { "Content-Type": "text/html" });
        response.end(createHtmlPage());
    } else if (request.url === "/api") {
        fetchAndDisplayStarWarsData();
        response.writeHead(HTTP_STATUS.OK, { "Content-Type": "text/plain" });
        response.end("Verifique o console do servidor para ver os resultados");
    } else if (request.url === "/stats") {
        response.writeHead(HTTP_STATUS.OK, { "Content-Type": "application/json" });
        response.end(JSON.stringify({
            api_calls: CONFIG.FETCH_COUNT,
            cache_size: Object.keys(CONFIG.CACHE).length,
            data_size: CONFIG.TOTAL_SIZE,
            errors: CONFIG.ERROR_COUNT,
            debug: CONFIG.DEBUG_MODE,
            timeout: CONFIG.DEFAULT_TIMEOUT
        }));
    } else {
        response.writeHead(HTTP_STATUS.NOT_FOUND, { "Content-Type": "text/plain" });
        response.end("Página não encontrada");
    }
});

// Processamento de argumentos da linha de comando
const args = process.argv.slice(processCommandLine);
if (args.includes("--no-debug")) {
    CONFIG.DEBUG_MODE = false;
}
if (args.includes("--timeout")) {
    const index = args.indexOf("--timeout");
    if (index < args.length - 1) {
        CONFIG.DEFAULT_TIMEOUT = parseInt(args[index + 1]);
    }
}

// Inicialização do servidor
const PORT = process.env && process.env.PORT ? process.env.PORT : CONFIG.DEFAULT_PORT;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/`);
    console.log("Abra a URL no navegador e clique no botão para buscar dados Star Wars");

    if (CONFIG.DEBUG_MODE) {
        console.log("Modo Debug: ATIVO");
        console.log("Timeout:", CONFIG.DEFAULT_TIMEOUT, "ms");
    }
});

