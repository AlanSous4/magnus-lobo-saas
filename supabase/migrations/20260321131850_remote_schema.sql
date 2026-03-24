


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."atualizar_total_pendencia"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin

  update clientes_pendentes
  set total = (
    select coalesce(sum(subtotal),0)
    from clientes_pendentes_itens
    where pendente_id = coalesce(new.pendente_id, old.pendente_id)
  )
  where id = coalesce(new.pendente_id, old.pendente_id);

  return null;

end;
$$;


ALTER FUNCTION "public"."atualizar_total_pendencia"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'username', new.email),
    COALESCE(new.raw_user_meta_data ->> 'full_name', null),
    new.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    username = COALESCE(EXCLUDED.username, profiles.username),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email);
  
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."produtos_mais_vendidos"("periodo" integer) RETURNS TABLE("nome" "text", "quantidade" integer)
    LANGUAGE "sql"
    AS $$
  select
    p.name as nome,
    sum(si.quantity) as quantidade
  from sale_items si
  join sales s on s.id = si.sale_id
  join products p on p.id = si.product_id
  where s.created_at >= 
    case 
      when periodo = 0 then date_trunc('day', now()) -- todas as vendas de hoje
      else now() - (periodo || ' days')::interval
    end
  group by p.name
  order by quantidade desc
  limit 5
$$;


ALTER FUNCTION "public"."produtos_mais_vendidos"("periodo" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendas_por_pagamento"("periodo" integer) RETURNS TABLE("payment_method" "text", "total" numeric)
    LANGUAGE "sql"
    AS $$
  select
    payment_method,
    sum(total_amount) as total
  from sales
  where
    created_at >=
      date_trunc('day', timezone('America/Sao_Paulo', now()))
      - (periodo - 1) * interval '1 day'
  and user_id = auth.uid()
  group by payment_method
  order by total desc;
$$;


ALTER FUNCTION "public"."vendas_por_pagamento"("periodo" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendas_por_produto"("periodo" integer, "produto_nome" "text") RETURNS TABLE("venda_id" "uuid", "data_venda" timestamp with time zone, "quantidade" integer, "valor" numeric)
    LANGUAGE "sql"
    AS $$
  select
    s.id as venda_id,
    s.created_at as data_venda,
    si.quantity as quantidade,
    si.subtotal as valor
  from sale_items si
  join sales s on s.id = si.sale_id
  join products p on p.id = si.product_id
  where p.name = produto_nome
    and s.created_at >= 
      case 
        when periodo = 0 then date_trunc('day', now()) -- todas as vendas de hoje
        else now() - (periodo || ' days')::interval
      end
  order by s.created_at desc
$$;


ALTER FUNCTION "public"."vendas_por_produto"("periodo" integer, "produto_nome" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clientes_pendentes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cliente_nome" "text" NOT NULL,
    "total" numeric(10,2) DEFAULT 0 NOT NULL,
    "data_retirada" "date" NOT NULL,
    "pago" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."clientes_pendentes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clientes_pendentes_itens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pendente_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "is_weight" boolean DEFAULT false
);


ALTER TABLE "public"."clientes_pendentes_itens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "value" numeric(10,2) NOT NULL,
    "quantity" integer DEFAULT 0 NOT NULL,
    "expiration_date" "date",
    "entry_date" timestamp with time zone DEFAULT "now"(),
    "exit_date" timestamp with time zone,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "is_weight" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" numeric(10,3) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_weight" boolean DEFAULT false NOT NULL,
    "product_name" "text"
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_amount" numeric(10,2) NOT NULL,
    "payment_method" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "total_value" numeric(10,2),
    CONSTRAINT "sales_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'pix'::"text", 'credit'::"text", 'debit'::"text", 'vr'::"text", 'va'::"text"])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


ALTER TABLE ONLY "public"."clientes_pendentes_itens"
    ADD CONSTRAINT "clientes_pendentes_itens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes_pendentes"
    ADD CONSTRAINT "clientes_pendentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_products_expiration_date" ON "public"."products" USING "btree" ("expiration_date");



CREATE INDEX "idx_products_user_id" ON "public"."products" USING "btree" ("user_id");



CREATE INDEX "idx_sale_items_product_id" ON "public"."sale_items" USING "btree" ("product_id");



CREATE INDEX "idx_sale_items_sale_id" ON "public"."sale_items" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_created_at" ON "public"."sales" USING "btree" ("created_at");



CREATE INDEX "idx_sales_user_id" ON "public"."sales" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trigger_atualizar_total_pendencia" AFTER INSERT OR DELETE OR UPDATE ON "public"."clientes_pendentes_itens" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_total_pendencia"();



ALTER TABLE ONLY "public"."clientes_pendentes_itens"
    ADD CONSTRAINT "clientes_pendentes_itens_pendente_id_fkey" FOREIGN KEY ("pendente_id") REFERENCES "public"."clientes_pendentes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clientes_pendentes_itens"
    ADD CONSTRAINT "clientes_pendentes_itens_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clientes_pendentes"
    ADD CONSTRAINT "clientes_pendentes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow read products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Permitir leitura de itens para o dono da venda" ON "public"."sale_items" FOR SELECT USING (("sale_id" IN ( SELECT "sales"."id"
   FROM "public"."sales"
  WHERE ("sales"."user_id" = "auth"."uid"()))));



CREATE POLICY "Permitir update para donos" ON "public"."clientes_pendentes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sale items" ON "public"."sale_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sales"
  WHERE (("sales"."id" = "sale_items"."sale_id") AND ("sales"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."clientes_pendentes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clientes_pendentes_itens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete pendente itens" ON "public"."clientes_pendentes_itens" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "delete_own_pendencias" ON "public"."clientes_pendentes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "delete_pendencia_items" ON "public"."clientes_pendentes_itens" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "insert pendente itens" ON "public"."clientes_pendentes_itens" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete_own" ON "public"."products" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "products_insert_own" ON "public"."products" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "products_select_own" ON "public"."products" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "products_update_own" ON "public"."products" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_own" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sale_items_insert" ON "public"."sale_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "sale_items_select" ON "public"."sale_items" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select pendente itens" ON "public"."clientes_pendentes_itens" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "update pendente itens" ON "public"."clientes_pendentes_itens" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "users can insert pendencias" ON "public"."clientes_pendentes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users can insert pendencias itens" ON "public"."clientes_pendentes_itens" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "users can update their own pendencias" ON "public"."clientes_pendentes" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users can view pendencias itens" ON "public"."clientes_pendentes_itens" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users can view their pendencias" ON "public"."clientes_pendentes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_insert_sales" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_view_sales" ON "public"."sales" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."products";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."atualizar_total_pendencia"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_total_pendencia"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_total_pendencia"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."produtos_mais_vendidos"("periodo" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."produtos_mais_vendidos"("periodo" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."produtos_mais_vendidos"("periodo" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vendas_por_pagamento"("periodo" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vendas_por_pagamento"("periodo" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendas_por_pagamento"("periodo" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vendas_por_produto"("periodo" integer, "produto_nome" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vendas_por_produto"("periodo" integer, "produto_nome" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendas_por_produto"("periodo" integer, "produto_nome" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."clientes_pendentes" TO "anon";
GRANT ALL ON TABLE "public"."clientes_pendentes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes_pendentes" TO "service_role";



GRANT ALL ON TABLE "public"."clientes_pendentes_itens" TO "anon";
GRANT ALL ON TABLE "public"."clientes_pendentes_itens" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes_pendentes_itens" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Give anon users access to JPG images in folder 1ifhysk_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'products'::text));



