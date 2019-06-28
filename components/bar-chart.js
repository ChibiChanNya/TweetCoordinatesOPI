import {Bar, mixin, mixins} from 'vue-chartjs'

const {reactiveProp} = mixins;


export default {
  extends: Bar,
  mixins: [reactiveProp],
  props: ['data', 'options'],
  mounted() {
    this.renderChart(this.chartData, this.options)
  }
}
