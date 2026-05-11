export const MU_PLUGIN_FILENAME = "sitemapseo-rest-api.php";

export const MU_PLUGIN_VERSION = "2";

export const MU_PLUGIN_SOURCE = `<?php
/**
 * SitemapSEO – Yoast-Felder + WPML-Translations für REST API freischalten
 *
 * Version: 2 (mit Robots-Meta + WPML-Translation-Map)
 *
 * Installation: Diese Datei nach /wp-content/mu-plugins/ kopieren
 * (Falls der Ordner mu-plugins nicht existiert, einfach anlegen).
 * Eine bestehende ältere Version dieser Datei einfach ersetzen.
 */

if (!defined('SITEMAPSEO_MU_VERSION')) {
    define('SITEMAPSEO_MU_VERSION', '2');
}

$sitemapseo_post_types = ['page', 'post', 'avada_faq', 'ibd_projekt', 'mitarbeiter', 'vertretung'];

add_action('init', function () use ($sitemapseo_post_types) {
    $meta_keys = [
        '_yoast_wpseo_title',
        '_yoast_wpseo_metadesc',
        '_yoast_wpseo_focuskw',
        '_yoast_wpseo_meta-robots-noindex',
        '_yoast_wpseo_meta-robots-nofollow',
    ];

    foreach ($sitemapseo_post_types as $pt) {
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

add_action('rest_api_init', function () use ($sitemapseo_post_types) {
    // Versions-Endpoint zum schnellen Checken
    register_rest_route('sitemapseo/v1', '/version', [
        'methods'             => 'GET',
        'permission_callback' => function () { return current_user_can('edit_posts'); },
        'callback'            => function () {
            return [
                'version' => SITEMAPSEO_MU_VERSION,
                'wpml'    => function_exists('apply_filters') && has_filter('wpml_element_trid'),
            ];
        },
    ]);

    foreach ($sitemapseo_post_types as $pt) {
        register_rest_field($pt, 'sitemapseo_translations', [
            'get_callback' => function ($obj) {
                if (!function_exists('apply_filters')) {
                    return null;
                }
                $element_type = 'post_' . $obj['type'];
                $trid = apply_filters('wpml_element_trid', null, $obj['id'], $element_type);
                if (!$trid) {
                    return null;
                }
                $translations = apply_filters('wpml_get_element_translations', null, $trid, $element_type);
                if (!is_array($translations)) {
                    return ['trid' => (string) $trid, 'siblings' => new stdClass()];
                }
                $siblings = [];
                foreach ($translations as $code => $t) {
                    if (isset($t->element_id)) {
                        $siblings[$code] = (int) $t->element_id;
                    }
                }
                return ['trid' => (string) $trid, 'siblings' => $siblings ?: new stdClass()];
            },
        ]);
    }
});
`;
