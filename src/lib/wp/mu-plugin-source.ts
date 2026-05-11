export const MU_PLUGIN_FILENAME = "sitemapseo-rest-api.php";

export const MU_PLUGIN_SOURCE = `<?php
/**
 * SitemapSEO – Yoast-Felder für REST API freischalten
 *
 * Installation: Diese Datei nach /wp-content/mu-plugins/ kopieren.
 * (Falls der Ordner mu-plugins nicht existiert, einfach anlegen.)
 */
add_action('init', function () {
    $post_types = ['page', 'post', 'avada_faq', 'ibd_projekt', 'mitarbeiter', 'vertretung'];
    $meta_keys  = ['_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_focuskw'];

    foreach ($post_types as $pt) {
        foreach ($meta_keys as $mk) {
            register_post_meta($pt, $mk, [
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function () { return current_user_can('edit_posts'); },
            ]);
        }
    }
});
`;
