# ADR01: Decisões Iniciais (Web Assembly vs JS)

* **Issue**: Which technology will be used on the development of the scheduler.

* **Decision**: The decision is to use Web Assembly (Wasm) for the development of the core scheduler code, instead of pure JavaScript. For the user interface and interactions, JavaScript will be used to leverage its strengths in DOM manipulation and event handling.

* **Status**: The decision is approved.

* **Positions**: The main argument for javascript in the scheduler is that it is a widely used language with a large ecosystem, making it easier to find resources and libraries for development. Additionally, JavaScript is natively supported in web browsers, which can simplify deployment and reduce the need for additional tooling. On the other hand, Web Assembly offers significant performance benefits, especially for computationally intensive tasks like scheduling algorithms. It allows us to write performance-critical code in languages like C++ and compile it to Wasm, which can run at near-native speed in the browser. Additionally, it is possible to compile the same codebase to both Web Assembly and native binaries, providing flexibility in deployment options. Another positive point for Web Assembly is that it represents a more modern approach to web development, allowing us to leverage the latest advancements in browser technology and potentially future-proofing our application.

* **Argument**: The decision to use Web Assembly for the core scheduler code is based on the need for high performance in scheduling algorithms, which can be computationally intensive. By using Web Assembly, we can achieve near-native performance in the browser, which is crucial for providing a responsive user experience. Additionally, using JavaScript for the user interface allows us to take advantage of its strengths in DOM manipulation and event handling, creating a more interactive and user-friendly interface. This combination of technologies allows us to optimize both performance and usability in our application. Also the use of new technologies can be beneficial for the team’s growth and learning, as it encourages us to explore and adopt modern web development practices.

* **Implications**: Using Web Assembly will require us to write performance-critical code in a language that can be compiled to Wasm, such as C++. This may introduce additional complexity in the development process, as we will need to manage the interaction between JavaScript and Web Assembly. We will also need to ensure that our development environment is set up to support Web Assembly compilation and debugging. Additionally, we may need to consider the learning curve for team members who are not familiar with Web Assembly or the languages used for its development. However, the performance benefits and flexibility provided by Web Assembly are expected to outweigh these challenges.

* **Notes**:
  * We will need to set up a build process that can compile our C++ code to Web Assembly, as well as generate native binaries for testing and development purposes.
  * We should consider using tools like Emscripten to facilitate the compilation of C++ code to Web Assembly.
  * It will be important to establish clear communication and documentation around the interaction between JavaScript and Web Assembly to ensure that all team members understand how the two technologies work together in our application.
