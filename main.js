function init(){

}

if (!document.readyState === "complete"){
    init();
} else {
    document.addEventListener("load", init());
}