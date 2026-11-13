class AccessAPI{
    //sets API starting URL
    URL = "https://www.dnd5eapi.co/api/2014/"

    
    constructor (){};

    //Used to change the URL, may be used for navigation
    setURL(URL){
        this.URL = URL;
    }

    //method to get JSON file from the API
    async getData() {
        response = await fetch(URL);
        if(response.ok()){
            return response.json();
        }
        else{
            throw new Error("Something Went Wrong " + respons.status());
        }
    }

    async getNewData(newURL) {
        this.setURL(newURL);
        return this.getData();
    }
}