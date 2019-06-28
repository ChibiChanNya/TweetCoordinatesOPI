<template>
  <v-layout
    column
    justify-center
    align-center
  >
    <v-flex
      xs12
      sm8
      md6
    >
      <div class="text-xs-center">
        <logo />
      </div>
      <v-card>
        <v-card-title class="headline">
          Bienvenidos a mi solución para el ejercicio de reclutamiento de OPI Analytics
        </v-card-title>
        <v-card-text>
          <p>Fué mucho trabajo completar esta tarea pero fue una experiencia divertida en la que aprendí mucho. Disculpas por usar VUE en lugar de Angular.</p>
          <p>
            Antes de continuar, asegúrate de tener el archivo <code>stream.jsonl</code> en la acarpeta  <code>/static</code>. Puedes descargae el archivo <a
              href="https://s3-us-west-2.amazonaws.com/opi-rrhh/frontend/stream.jsonl"
              target="_blank"
            >
              en este link
            </a>.
          </p>
          <p>
           Hay que tener en cuenta que existen 2 versiones del código para cargar ese archivo:
          </p>
          <ul>
            <li>Cuando se entra a la <a href="/map" target="_blank">página del dashboard</a> se utiliza Server-Side rendering para reducir el tiempo de carga.</li>
            <li>Cuando se entra por medio de un <v-btn
              color="primary"
              class="pa-0 ma-0"
              flat
              nuxt
              to="/map"
            >link interno</v-btn>
              se llama a un endpoint de Express que entrega una versión reducida del archivo por http.
            </li>
          </ul>
          <p>
            Hay un diseño personalizado para la vista responsiva en la que se separa el contenido para mejor visualización. Asegúrense de checarlo.
          </p>
          <p>Gracias por la oportunidad que me dieron, es una buena tarea. Espero desarrollar más aps para ustedes en el futuro.</p>
          <div class="text-xs-right">
            <em><small>&mdash; Chibi</small></em>
          </div>
          <hr class="my-3">
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            flat
            nuxt
            to="/map"
          >
            Ir al Dashboard
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script>
import Logo from '~/components/Logo.vue'

export default {
  components: {
    Logo,
  }
}
</script>
