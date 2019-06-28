<template>
  <v-layout text-xs-center wrap row justify-center>
    <v-dialog
      v-model="loading"
      hide-overlay
      persistent
      width="300"
    >
      <v-card
        color="primary"
        dark
      >
        <v-card-text>
          Cargando datos...
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0"
          ></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-flex v-if="isMobile">
      <h1 class="pa-2">Total de tweets seleccionados: {{focus_items.length}}</h1>
      <v-btn color="primary" class="mb-3" @click="drawer = !drawer">Ver Graficos</v-btn>
      <v-navigation-drawer
        v-model="drawer"
        right
        fixed
        temporary
        class="px-4"
      >
        <div v-if="!loading">
          <h2>Tweets con geolocalización</h2>
          <PieChart v-if="!loading" :chart-data="coords_pie" :options="{ maintainAspectRatio: false }"/>
          <v-divider class="mb-2"></v-divider>
          <h2>Distribución de tweets en países principales</h2>
          <DoughnutChart v-if="!loading" :chart-data="region_donut" :options="{ maintainAspectRatio: false }"/>
          <v-divider class="mb-2"></v-divider>
          <h2>Cantidad de tweets por región</h2>
          <BarChart v-if="!loading" :chart-data="users_region_bar"
                    :options="{ legend: { display: false },maintainAspectRatio: false }"/>
        </div>
      </v-navigation-drawer>
    </v-flex>

    <v-flex md3 align-center v-else>
      <h1 class="pb-4">Total de tweets seleccionados: {{focus_items.length}}</h1>
      <div v-if="!loading">
        <h2>Tweets con geolocalización</h2>
        <PieChart v-if="!loading" :chart-data="coords_pie" :options="{ maintainAspectRatio: false }"/>
        <v-divider class="mb-2"></v-divider>
        <h2>Distribución de tweets en países principales</h2>
        <DoughnutChart v-if="!loading" :chart-data="region_donut" :options="{ maintainAspectRatio: false }"/>
        <v-divider class="mb-2"></v-divider>
        <h2>Cantidad de tweets por región</h2>
        <BarChart v-if="!loading" :chart-data="users_region_bar"
                  :options="{ legend: { display: false },maintainAspectRatio: false }"/>
      </div>
    </v-flex>

    <v-flex xs12 md7 offset-md1>

      <div :style="isMobile? 'width:100%;height:60vh' : 'width:60%;height:80%;position:fixed'">
        <GmapMap
          :center=center
          :zoom="11"
          map-type-id="terrain"
          :style="'width: 100%; height: 100%;'"
          @click="setFocus"
          :options="{zoomControl: true}"
        >
          <GmapMarker
            v-if="focus_point"
            :position="focus_point.position"
            @click="removeFocus"
            :icon="{url: 'http://maps.google.com/mapfiles/ms/icons/grn-pushpin.png'}"
          >

          </GmapMarker>
          <GmapCircle
            v-if="focus_point"
            :center="focus_point.position"
            :radius="5000"
            :visible="true"
            :options="{fillColor:'red',fillOpacity:0.4}"
            @click="removeFocus"
          >

          </GmapCircle>
          <gmap-cluster>
            <GmapMarker
              v-for="(m, index) in markers"
              :key="index"
              :position="m.position"
              @click="center=m.position"
            />
          </gmap-cluster>

        </GmapMap>
      </div>

    </v-flex>
  </v-layout>
</template>

<script>
  import {gmapApi} from 'vue2-google-maps'
  import DoughnutChart from '~/components/doughnut-chart'
  import BarChart from '~/components/bar-chart'
  import PieChart from '~/components/pie-chart'

  export default {

    // Component state control.
    data() {
      return {
        items: null,
        counter: null,
        loading: true, // Don't display the charts when they are being calculated.
        isMobile: false,
        focus_point: null, // Coordinates for the custom map point
        drawer: false, // Wehter to show the charts on mobile.
        center: { // Initial center of the google maps. Picked Mexico City because of high tweet concentration.
          lat: 19.432608,
          lng: -99.133209
        },
        region_donut: null, //Datasets for the 3 charts.
        users_region_bar: null,
        coords_pie: null,
      }
    },

    components: {
      DoughnutChart,
      BarChart,
      PieChart
    },

    computed: {
      google: gmapApi,


      /*
      * When the the circle is drawn on the map, obtain the subset of tweets and set is as the
      * "focus_items" array. It simply filters the total tweets for which ones are close enough to the circle center.
      * */
      focus_items() {
        if (!this.items) {
          return [];
        }
        if (!this.focus_point || !this.focus_point.position) {
          return this.items;
        } else {
          return this.items.filter((tweet) => {
            const lat = tweet.coordinates[1];
            const lng = tweet.coordinates[0];
            const point = {lat: lat, lng: lng};
            const target = {lat: this.focus_point.position.lat(), lng: this.focus_point.position.lng()};
            return this.arePointsNear(point, target, 5);
          })
        }
      },

      /* Converts the list of tweets into an array google-maps-friendly markers */
      markers() {
        return this.items && this.items.map((item) => {
          return {
            position: {
              lat: item.coordinates[1],
              lng: item.coordinates[0],
            }
          }
        })
      },
    },

    /*
    * Watch the map circle. Whenever it is generated or removed the maps must be reloaded to account for
    * the covered tweets.
    * */
    watch: {
      focus_items: function (new_val) {
        this.loading = true;
        this.load_charts();
      }
    },

    /*
    *  Function which must be completed before the page loads. Is run Server-Side when the app is first entered, but
    *  will be run client-side when navigating through the app. In that case, it will use a Back-End
    *  Express Endpoint to get the same data.
    *  Only the tweets with actual coordinates are included to reduce payload size. The total amount of tweets is also
    *  recorded as required by the first chart.
    * */
    async asyncData({$axios}) {
      if (process.server) {
        // SERVER SIDE RENDER
        const fs = require('fs');
        const path = require('path');
        console.log("Server");

        async function readData() {
          const DelimiterStream = require('delimiter-stream');

          let linestream = new DelimiterStream();
          let input = fs.createReadStream(path.resolve(__dirname + '../../static/stream.jsonl'));

          return new Promise((resolve, reject) => {
            let data = [];
            let counter = 0;
            linestream.on('data', (chunk) => {
              counter++;
              let parsed = JSON.parse(chunk);
              if (parsed.coordinates)
                data.push({
                  coordinates: parsed.coordinates.coordinates,
                  country: parsed.place && parsed.place.country_code,
                  location: parsed.place && parsed.place.full_name,
                  user: parsed.user.id
                });
            });

            linestream.on('end', () => {
              return resolve({data: data, counter: counter});
            });

            input.pipe(linestream);
          });
        }

        const items = await readData();
        return {items: items.data, counter: items.counter};

      }
    },

    /*
    * Hook invoked when the page has been loaded, after AsyncData.
    * If Client side, get data here.
    * */
    async mounted( ) {
      this.$nextTick(() => {
        this.$nuxt.$loading.start()
      });
      if (!process.server) {
        //  CLIENT SIDE LOAD
        console.log("CLIENT");
        const items = await this.$axios.$get('http://localhost:3000/api/stream');
        console.log("Got", items);
        this.$nuxt.$loading.finish();
        this.items = items.items;
        this.counter = items.counter;
      }

      this.load_charts();
      window.addEventListener("resize", this.checkIsMobile);
      this.checkIsMobile();

    },

    beforeDestroy() {
      window.removeEventListener("resize", this.checkIsMobile);
    },

    methods: {

      /*
      * Figure out if the page is being viewed in a mobile-sized screen. Pretty basic.
      * Invoked whenever the page is loaded and when the screen is resized.
      * */
      checkIsMobile() {
        this.isMobile = window.innerWidth < 640;
      },

      setFocus(e) {
        /*
        * Creates a point and circle on the map whenever you click an empty area.
        * */
        this.focus_point = {
          position: e.latLng
        }
      },

      /*
      * Deleted the point and circle on the map when it gets clicked.
      * */
      removeFocus() {
        this.focus_point = null;
      },

      /* Get the data to fill all 3 charts. To be run whenever the data changes or when the page first loads */
      load_charts() {
        this.fill_pie();
        this.fill_doughnut();
        this.fill_bar();
        this.loading = false;
      },

      /*
      * Fill Pie Chart with all items that have coordinates.
      * When the focus circle is drawn, it still uses the same total since the circle can
      * only consider items with coordinates anyways.
      * */
      fill_pie() {
        let items = this.focus_items;
        this.coords_pie = {
          labels: ["Con Coordenadas", "Sin Coordenadas"],
          datasets: [
            {
              backgroundColor: ['#f8cc40', 'rgba(88,91,91,1)'],
              data: [
                items.length,
                this.counter - items.length,
              ],
            }
          ]
        };
      },

      /*
      * Fill the Doghnut chart with the amount of tweets originating from each of the specified countries.
      * Mexico, USA, Guatemala and Belize were specifically requested.
      * */
      fill_doughnut() {
        let items = this.focus_items;
        this.region_donut = {
          labels: ["México", "USA", "Guatemala", "Belice"],
          datasets: [
            {
              backgroundColor: ['#f81e2d', '#2623c1', '#37f84b', '#f15719'],
              data: [
                items.filter(tweet => tweet.country === 'MX').length,
                items.filter(tweet => tweet.country === 'US').length,
                items.filter(tweet => tweet.country === 'GT').length,
                items.filter(tweet => tweet.country === 'BLZ').length,
              ],
            }
          ]
        };
      },

      /*
      * Fills the bar chart with the amount of tweets in a given region and renders it.
      * It will have 2 versions. Once the focus circle is drawn then it should use location, rather than country.
      * */
      fill_bar() {
        const group_by = this.focus_point ? "location" : "country";
        const data_countries = _.groupBy(this.focus_items, group_by);
        let labels = [];
        let data = [];
        let bg_colors = [];
        _.forOwn(data_countries, (value, key) => {
          if (key !== "null") {
            data.push(_.uniqBy(value, "user").length);
            labels.push(key);
            bg_colors.push(this.getRandomColor());
          }
        });

        this.users_region_bar = {
          labels: labels,
          datasets: [
            {
              backgroundColor: bg_colors,
              data: data,

            }
          ]
        };
      },

      /*
      * Returns a random Hex color to use for each of the bars in the Bar Chart.
      * */
      getRandomColor() {
        let letters = '0123456789ABCDEF';
        let color = '#';
        for (var i = 0; i < 6; i++) {
          color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
      },

      /*
      * Calculates if 2 coordinates are within km range of each other. Somewhat imperfect.
      * It measures the distance in kilometers between the focus point center and a given tweet location.
      * If the distance is less than the 5km circle radius, it returns true.
      * */
      arePointsNear(checkPoint, centerPoint, km) {
        const R = 6371; // metres
        const q1 = dToR(checkPoint.lat);
        const q2 = dToR(centerPoint.lat);
        const dq = dToR(centerPoint.lat - checkPoint.lat);
        const da = dToR(centerPoint.lng - checkPoint.lng);
        const a = Math.sin(dq / 2) * Math.sin(dq / 2) +
          Math.cos(q1) * Math.cos(q2) *
          Math.sin(da / 2) * Math.sin(da / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c;
        return d <= km;

        //* Convert Degrees to Radians*/
        function dToR(degrees) {
          const pi = Math.PI;
          return degrees * (pi / 180);
        }
      }

    }

  }
</script>

<style>
  .sticky {
    position: -webkit-sticky;
    position: sticky;
  }

  .screen {
    position: absolute;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    z-index: 200;
  }
</style>
