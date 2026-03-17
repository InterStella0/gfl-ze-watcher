extern crate proc_macro;

use proc_macro::TokenStream;
use quote::{quote};
use syn::{parse_macro_input, DeriveInput, Fields, Type};

#[proc_macro_attribute]
pub fn auto_serde_with(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(item as DeriveInput);
    let name = &ast.ident;
    let visibility = &ast.vis;

    let expanded = match &ast.data {
        syn::Data::Struct(data_struct) => {
            let fields = match &data_struct.fields {
                Fields::Named(fields_named) => {
                    let modified_fields = fields_named.named.iter().map(|field| {
                        let field_name = &field.ident;
                        let field_type = &field.ty;
                        let field_visibility = &field.vis;

                        let serde_attrs = get_serde_attrs(field_type);

                        quote! {
                            #serde_attrs
                            #field_visibility #field_name: #field_type,
                        }
                    });

                    quote! {
                        {
                            #(#modified_fields)*
                        }
                    }
                },
                _ => {
                    return syn::Error::new_spanned(&ast, "auto_serde_with can only be applied to structs with named fields")
                        .to_compile_error()
                        .into();
                }
            };

            quote! {
                #[derive(serde::Serialize, serde::Deserialize)]
                #visibility struct #name #fields
            }
        },
        _ => {
            return syn::Error::new_spanned(&ast, "auto_serde_with can only be applied to structs")
                .to_compile_error()
                .into();
        }
    };

    expanded.into()
}


fn get_serde_attrs(field_type: &Type) -> proc_macro2::TokenStream {
    if let Some(attrs) = match_type(field_type) {
        attrs
    } else {
        quote! {}
    }
}

fn match_type(field_type: &Type) -> Option<proc_macro2::TokenStream> {
    // Welp, manual typing here, cos too lazy
    let selected_types = ["OffsetDateTime", "PgInterval"];

    if let Type::Path(type_path) = field_type {
        if let Some(segment) = type_path.path.segments.last() {
            let type_name = segment.ident.to_string();

            if type_name == "Option" {
                if let syn::PathArguments::AngleBracketed(args) = &segment.arguments {
                    if let Some(syn::GenericArgument::Type(inner_type)) = args.args.first() {
                        if let Some(inner_segment) = extract_type_name(inner_type) {
                            let inner_type_name = inner_segment.to_string();

                            if selected_types.contains(&inner_type_name.as_str()) {
                                let serializer = format!("serialize_option_{}", inner_type_name.to_lowercase());
                                let deserializer = format!("deserialize_option_{}", inner_type_name.to_lowercase());

                                return Some(quote! {
                                    #[serde(serialize_with = #serializer, deserialize_with = #deserializer)]
                                });
                            }
                        }
                    }
                }
            } else if selected_types.contains(&type_name.as_str()) {
                let serializer = format!("serialize_{}", type_name.to_lowercase());
                let deserializer = format!("deserialize_{}", type_name.to_lowercase());

                return Some(quote! {
                    #[serde(serialize_with = #serializer, deserialize_with = #deserializer)]
                });
            }
        }
    }
    None
}


fn extract_type_name(field_type: &Type) -> Option<&syn::Ident> {
    if let Type::Path(type_path) = field_type {
        return type_path.path.segments.last().map(|seg| &seg.ident);
    }
    None
}
