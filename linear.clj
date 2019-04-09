(defn scalar-vec? [& vals] (every? (fn [v] (number? v)) vals))

(defn same-length-vecs?
  ([] true)
  ([v] true)
  ([v  vec] (and (vector? v) (and (vector? vec) (== (count vec) (count v)))))
  ([v1 v2 & v] (and (same-length-vecs? v1 v2) reduce same-length-vecs? v2 v))
  )

(defn checked-vec-op [op] (fn [v & vcs]
                            {:pre [(apply same-length-vecs? v vcs)]}
                            (apply op v vcs)))

(defn apply_v1_v2 [f] (checked-vec-op (fn [& vcs] (apply mapv f vcs))))
(defn apply_v1_scalar [f] (fn
                            ([arg] arg)
                            ([arg & vals] (mapv (fn [layer] (apply f layer vals)) arg))
                            ))



(def v+ (apply_v1_v2 +))
(def m+ (apply_v1_v2 v+))
(def v- (apply_v1_v2 -))
(def m- (apply_v1_v2 v-))
(def v* (apply_v1_v2 *))
(def m* (apply_v1_v2 v*))
(def v*s (apply_v1_scalar *))
(def m*s (apply_v1_scalar v*s))

(defn scalar [& args] (apply +(apply v* args)))
(defn vect
  ([v1 v2]
   {:pre [(vector? v1) (vector? v2) (== (count v1) 3) (== (count v2) 3)]}
   (vector (- (* (nth v1 1) (nth v2 2)) (* (nth v1 2) (nth v2 1)))
           (- (* (nth v1 2) (nth v2 0)) (* (nth v1 0) (nth v2 2)))
           (- (* (nth v1 0) (nth v2 1)) (* (nth v1 1) (nth v2 0)))))
  ([v1] {:pre [(vector? v1)]} v1)
  ([v1 v2 & v]
   {:pre [(apply same-length-vecs? v1 v2 v)]}
   (reduce vect (vect v1 v2) v))
  )
(def m*v (fn [m v] (mapv(fn [row] (scalar row v)) m)))
(defn transpose [m] (apply mapv vector m))
(def m*m (fn
           ([m1] m1)
           ([m1 m2] (mapv (fn [ra] (mapv (fn [cb] (scalar ra cb)) (transpose m2))) m1))
           ([m1 m2 & m] (reduce m*m (m*m m1 m2) m))
           ))